import React from 'react';
import './MatrixLoader.css';

/**
 * Matrix-styled loading animation
 * Shows falling green characters like the Matrix movie
 */
const MatrixLoader = ({ message = 'Uploading...', size = 'medium' }) => {
    const sizeConfig = {
        small: { width: 60, height: 60, fontSize: '0.6rem' },
        medium: { width: 100, height: 100, fontSize: '0.8rem' },
        large: { width: 150, height: 150, fontSize: '1rem' }
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    // Generate random Matrix characters
    const matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

    const columns = 8;
    const rows = 10;

    return (
        <div className="matrix-loader-overlay">
            <div className="matrix-loader-container" style={{ width: config.width, height: config.height }}>
                <div className="matrix-rain">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className="matrix-column"
                            style={{
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${1 + Math.random() * 2}s`
                            }}
                        >
                            {Array.from({ length: rows }).map((_, rowIndex) => (
                                <span
                                    key={rowIndex}
                                    className="matrix-char"
                                    style={{
                                        fontSize: config.fontSize,
                                        animationDelay: `${rowIndex * 0.1}s`,
                                        opacity: 1 - (rowIndex * 0.08)
                                    }}
                                >
                                    {matrixChars[Math.floor(Math.random() * matrixChars.length)]}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="matrix-loader-spinner"></div>
            </div>
            <div className="matrix-loader-message" style={{ fontSize: config.fontSize }}>
                {message}
            </div>
        </div>
    );
};

export default MatrixLoader;
