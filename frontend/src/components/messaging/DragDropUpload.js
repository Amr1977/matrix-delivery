import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const DragDropUpload = ({ onImageDrop, onVideoDrop, disabled }) => {
    const onDrop = useCallback((acceptedFiles) => {
        if (disabled || acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];

        // Determine file type
        if (file.type.startsWith('image/')) {
            onImageDrop?.(file);
        } else if (file.type.startsWith('video/')) {
            onVideoDrop?.(file);
        }
    }, [onImageDrop, onVideoDrop, disabled]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'video/*': ['.mp4', '.webm', '.mov']
        },
        maxFiles: 1,
        disabled,
        noClick: true, // Only drag-and-drop, not click
        noKeyboard: true
    });

    if (!isDragActive && !isDragReject) {
        // Return invisible drop zone when not dragging
        return (
            <div
                {...getRootProps()}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: disabled ? 'none' : 'auto',
                    zIndex: isDragActive ? 1000 : -1
                }}
            >
                <input {...getInputProps()} />
            </div>
        );
    }

    return (
        <div
            {...getRootProps()}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isDragReject
                    ? 'rgba(239, 68, 68, 0.9)'
                    : 'rgba(79, 70, 229, 0.9)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                pointerEvents: disabled ? 'none' : 'auto'
            }}
        >
            <input {...getInputProps()} />

            <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '3rem',
                borderRadius: '1rem',
                border: '3px dashed white',
                textAlign: 'center'
            }}>
                {isDragReject ? (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
                        <div>File type not supported</div>
                        <div style={{ fontSize: '1rem', marginTop: '0.5rem', opacity: 0.8 }}>
                            Only images and videos allowed
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📁</div>
                        <div>Drop your file here</div>
                        <div style={{ fontSize: '1rem', marginTop: '0.5rem', opacity: 0.8 }}>
                            Images (max 10MB) or Videos (max 50MB)
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DragDropUpload;
