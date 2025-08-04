import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const UploadForm = ({ userDepartment, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [department, setDepartment] = useState(userDepartment);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [message, setMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const departments = ['HR', 'Finance', 'Legal', 'IT', 'Operations'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.xlsx', '.pptx', '.jpg', '.png'];

  const validateFile = useCallback((file) => {
  const errors = [];

  // Check file size
  if (file.size > maxFileSize) {
    errors.push(`File "${file.name}" exceeds 10MB limit`);
  }

  // Check file type
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedTypes.includes(fileExtension)) {
    errors.push(`File "${file.name}" has unsupported format. Allowed: ${allowedTypes.join(', ')}`);
  }

  return errors;
}, [maxFileSize, allowedTypes]);


  
  const handleFiles = useCallback((files) => {
  const fileList = Array.from(files);
  const validFiles = [];
  const errors = [];

  fileList.forEach(file => {
    const fileErrors = validateFile(file);
    if (fileErrors.length === 0) {
      const isDuplicate = selectedFiles.some(existingFile => 
        existingFile.name === file.name //&& existingFile.size === file.size
      );
      if (!isDuplicate) {
        validFiles.push({
          file: file,
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending'
        });
      } else {
        errors.push(`File "${file.name}" is already selected`);
      }
    } else {
      errors.push(...fileErrors);
    }
  });

  if (validFiles.length > 0) {
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setMessage('');
  }

  if (errors.length > 0) {
    setMessage(errors.join('. '));
  }
}, [selectedFiles, validateFile]);


  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      'pdf': '📄',
      'doc': '📝', 'docx': '📝',
      'txt': '📄',
      'xlsx': '📊', 'xls': '📊',
      'pptx': '📊', 'ppt': '📊',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️'
    };
    return iconMap[extension] || '📁';
  };

  const uploadSingleFile = async (fileData) => {
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('department', department);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:8000/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({
            ...prev,
            [fileData.id]: progress
          }));
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Upload failed' 
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      setMessage('Please select files to upload');
      return;
    }

    setUploading(true);
    setMessage('');

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Update file status to uploading
    setSelectedFiles(prev => 
      prev.map(file => ({ ...file, status: 'uploading' }))
    );

    // Upload files sequentially to avoid overwhelming the server
    for (const fileData of selectedFiles) {
      const result = await uploadSingleFile(fileData);
      
      if (result.success) {
        successCount++;
        setSelectedFiles(prev => 
          prev.map(file => 
            file.id === fileData.id 
              ? { ...file, status: 'completed' }
              : file
          )
        );
      } else {
        errorCount++;
        setSelectedFiles(prev => 
          prev.map(file => 
            file.id === fileData.id 
              ? { ...file, status: 'error', error: result.error }
              : file
          )
        );
      }
      
      results.push({ file: fileData, result });
    }

    setUploading(false);

    // Show summary message
    if (successCount > 0 && errorCount === 0) {
      setMessage(`✅ Successfully uploaded ${successCount} file(s)!`);
      // Clear successful uploads after a delay
      setTimeout(() => {
        setSelectedFiles(prev => prev.filter(file => file.status !== 'completed'));
        setUploadProgress({});
      }, 3000);
    } else if (successCount > 0 && errorCount > 0) {
      setMessage(`⚠️ ${successCount} files uploaded successfully, ${errorCount} failed`);
    } else {
      setMessage(`❌ All uploads failed. Please check file requirements.`);
    }

    if (onUploadSuccess && successCount > 0) {
      onUploadSuccess();
    }
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setUploadProgress({});
    setMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-container">
      <form onSubmit={handleSubmit}>
        {/* Department Selection */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            🏢 Target Department:
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            required
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`drag-drop-area ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? '#007bff' : '#ddd'}`,
            borderRadius: '8px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: dragActive ? '#f0f8ff' : '#f8f9fa',
            transition: 'all 0.3s ease',
            marginBottom: '20px'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {dragActive ? '📂' : '📁'}
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
            {dragActive ? 'Drop files here!' : 'Drag & drop files here'}
          </h3>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
            or <span style={{ color: '#007bff', textDecoration: 'underline' }}>browse files</span>
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#888' }}>
            Supported: {allowedTypes.join(', ')} • Max size: 10MB each
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          accept={allowedTypes.join(',')}
          style={{ display: 'none' }}
        />

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0 }}>📎 Selected Files ({selectedFiles.length})</h4>
              <button
                type="button"
                onClick={clearAllFiles}
                style={{
                  background: 'none',
                  border: '1px solid #dc3545',
                  color: '#dc3545',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🗑️ Clear All
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
              {selectedFiles.map((fileData) => (
                <div
                  key={fileData.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: '1px solid #eee',
                    backgroundColor: fileData.status === 'error' ? '#fff5f5' : 
                                   fileData.status === 'completed' ? '#f0fff4' : 'white'
                  }}
                >
                  <span style={{ fontSize: '20px', marginRight: '12px' }}>
                    {getFileIcon(fileData.name)}
                  </span>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {fileData.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatFileSize(fileData.size)}
                    </div>
                    
                    {/* Progress Bar */}
                    {fileData.status === 'uploading' && uploadProgress[fileData.id] !== undefined && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ 
                          width: '100%', 
                          height: '4px', 
                          backgroundColor: '#e0e0e0', 
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div
                            style={{
                              width: `${uploadProgress[fileData.id]}%`,
                              height: '100%',
                              backgroundColor: '#007bff',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          {uploadProgress[fileData.id]}% uploaded
                        </div>
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {fileData.status === 'error' && (
                      <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                        ❌ {fileData.error}
                      </div>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div style={{ marginLeft: '12px', fontSize: '16px' }}>
                    {fileData.status === 'pending' && '⏳'}
                    {fileData.status === 'uploading' && '⬆️'}
                    {fileData.status === 'completed' && '✅'}
                    {fileData.status === 'error' && '❌'}
                  </div>

                  {/* Remove Button */}
                  {fileData.status !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => removeFile(fileData.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        marginLeft: '8px',
                        fontSize: '16px'
                      }}
                      title="Remove file"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div 
            className={`alert ${message.includes('✅') ? 'alert-success' : 
                              message.includes('⚠️') ? 'alert-warning' : 'alert-danger'}`}
            style={{ marginBottom: '20px' }}
          >
            {message}
          </div>
        )}

        {/* Upload Button */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            type="submit" 
            className="btn btn-success"
            disabled={uploading || selectedFiles.length === 0}
            style={{ 
              padding: '12px 24px',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {uploading ? (
              <>
                <span>⏳</span>
                Uploading... ({selectedFiles.filter(f => f.status === 'completed').length}/{selectedFiles.length})
              </>
            ) : (
              <>
                <span>📤</span>
                Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
              </>
            )}
          </button>

          {selectedFiles.length > 0 && !uploading && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              Total size: {formatFileSize(selectedFiles.reduce((sum, file) => sum + file.size, 0))}
            </div>
          )}
        </div>
      </form>

      {/* Upload Guidelines */}
      <div style={{ 
        marginTop: '25px', 
        padding: '15px', 
        background: '#e9ecef', 
        borderRadius: '6px',
        fontSize: '13px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📋 Upload Guidelines</h4>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#6c757d' }}>
          <li>Supported formats: {allowedTypes.join(', ')}</li>
          <li>Maximum file size: 10MB per file</li>
          <li>Multiple files can be uploaded simultaneously</li>
          <li>Files are automatically scanned for security threats</li>
          <li>Cross-department uploads require admin approval</li>
          <li>All uploads are logged and monitored</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadForm;