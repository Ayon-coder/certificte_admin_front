import React, { useRef, useState } from 'react';
import styles from './FileUpload.module.css';

export default function FileUpload({ onFileSelect, accept, label, disabled }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
          hidden
        />
        <div className={styles.content}>
          <p>{label || 'Drop file here or click button below'}</p>
          {selectedFile && <p className={styles.fileName}>{selectedFile.name}</p>}
        </div>
      </div>
      <div className={styles.buttonGroup}>
        <button
          onClick={handleButtonClick}
          disabled={disabled}
          className={styles.chooseButton}
        >
          Choose File
        </button>
        <button
          onClick={handleUpload}
          disabled={disabled || !selectedFile}
          className={styles.uploadButton}
        >
          Upload
        </button>
      </div>
    </div>
  );
}
