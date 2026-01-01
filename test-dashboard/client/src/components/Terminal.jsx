import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const Terminal = ({ socket }) => {
    const terminalRef = useRef(null);
    const xtermInstance = useRef(null);
    const fitAddon = useRef(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm.js
        const term = new XTerm({
            cursorBlink: true,
            fontFamily: '"Fira Code", monospace',
            fontSize: 14,
            theme: {
                background: '#020617', // slate-950
                foreground: '#e2e8f0',
                cursor: '#22c55e',
            },
            convertEol: true, // Handle \n as \r\n
        });

        const fit = new FitAddon();
        term.loadAddon(fit);

        term.open(terminalRef.current);
        fit.fit(); // Initial fit

        xtermInstance.current = term;
        fitAddon.current = fit;

        term.writeln('\x1b[32mMatrix Test Dashboard Ready...\x1b[0m');
        term.writeln('Waiting for test execution...');

        // Resize handler
        const handleResize = () => fit.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
        };
    }, []);

    useEffect(() => {
        if (!socket || !xtermInstance.current) return;

        const term = xtermInstance.current;

        const handleLog = ({ type, data }) => {
            // Simple coloring based on stream type
            if (type === 'stderr') {
                term.write(`\x1b[31m${data}\x1b[0m`);
            } else {
                term.write(data);
            }
        };

        const handleStart = () => {
            term.clear();
            term.writeln('\x1b[36m--- Test Run Started ---\x1b[0m');
        };

        const handleEnd = ({ success, active }) => {
            if (success) {
                term.writeln('\n\x1b[32m--- Test Run PASSED ---\x1b[0m');
            } else {
                term.writeln('\n\x1b[31m--- Test Run FAILED ---\x1b[0m');
            }
        };

        socket.on('test:log', handleLog);
        socket.on('test:start', handleStart);
        socket.on('test:end', handleEnd);

        return () => {
            socket.off('test:log', handleLog);
            socket.off('test:start', handleStart);
            socket.off('test:end', handleEnd);
        };
    }, [socket]);

    return (
        <div className="absolute inset-0 bg-slate-950 p-2">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};

export default Terminal;
