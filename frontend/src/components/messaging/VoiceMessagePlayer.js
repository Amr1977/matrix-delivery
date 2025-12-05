import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const VoiceMessagePlayer = ({ audioUrl, duration, isOwnMessage }) => {
    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!waveformRef.current || !audioUrl) return;

        // Initialize WaveSurfer
        const wavesurfer = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: isOwnMessage ? 'rgba(255, 255, 255, 0.5)' : 'rgba(79, 70, 229, 0.5)',
            progressColor: isOwnMessage ? '#FFF' : '#4F46E5',
            cursorColor: isOwnMessage ? '#FFF' : '#4F46E5',
            barWidth: 2,
            barRadius: 3,
            cursorWidth: 1,
            height: 50,
            barGap: 2,
            responsive: true,
            normalize: true
        });

        wavesurferRef.current = wavesurfer;

        // Load audio
        wavesurfer.load(audioUrl);

        // Event listeners
        wavesurfer.on('ready', () => {
            setIsLoading(false);
        });

        wavesurfer.on('play', () => {
            setIsPlaying(true);
        });

        wavesurfer.on('pause', () => {
            setIsPlaying(false);
        });

        wavesurfer.on('audioprocess', () => {
            setCurrentTime(wavesurfer.getCurrentTime());
        });

        wavesurfer.on('finish', () => {
            setIsPlaying(false);
            setCurrentTime(0);
        });

        // Cleanup
        return () => {
            wavesurfer.destroy();
        };
    }, [audioUrl, isOwnMessage]);

    const handlePlayPause = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem',
            minWidth: '250px',
            maxWidth: '350px'
        }}>
            {/* Play/Pause Button */}
            <button
                onClick={handlePlayPause}
                disabled={isLoading}
                style={{
                    background: isOwnMessage ? 'rgba(255, 255, 255, 0.2)' : 'rgba(79, 70, 229, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '1.25rem',
                    flexShrink: 0,
                    opacity: isLoading ? 0.5 : 1
                }}
                title={isPlaying ? 'Pause' : 'Play'}
            >
                {isLoading ? '⏳' : isPlaying ? '⏸' : '▶️'}
            </button>

            {/* Waveform */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div ref={waveformRef} style={{ width: '100%' }} />
            </div>

            {/* Time Display */}
            <div style={{
                fontSize: '0.75rem',
                opacity: 0.7,
                minWidth: '45px',
                textAlign: 'right',
                flexShrink: 0
            }}>
                {formatTime(currentTime)} / {formatTime(duration || 0)}
            </div>
        </div>
    );
};

export default VoiceMessagePlayer;
