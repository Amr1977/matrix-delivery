import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Play, Square, Activity, Terminal as TerminalIcon } from 'lucide-react';
import Terminal from './components/Terminal';
import SuiteCard from './components/SuiteCard';

function App() {
    const [suites, setSuites] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [activeSuiteId, setActiveSuiteId] = useState(null);
    const [logs, setLogs] = useState([]); // Or handle in Terminal component
    const socketRef = useRef(null);

    useEffect(() => {
        // Connect Socket
        socketRef.current = io('/', {
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to server');
        });

        socketRef.current.on('test:start', ({ suiteId }) => {
            setIsRunning(true);
            setActiveSuiteId(suiteId);
        });

        socketRef.current.on('test:end', ({ success }) => {
            setIsRunning(false);
            setActiveSuiteId(null);
        });

        // Fetch initial state
        fetchSuites();
        fetchStatus();

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    const fetchSuites = async () => {
        try {
            const res = await axios.get('/api/suites');
            setSuites(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await axios.get('/api/status');
            setIsRunning(res.data.isRunning);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRun = async (suiteId) => {
        try {
            await axios.post('/api/run', { suiteId });
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to start');
        }
    };

    const handleStop = async () => {
        try {
            await axios.post('/api/stop');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
            {/* Sidebar / Suite List */}
            <div className="w-1/3 flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-md">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Activity className="w-6 h-6 text-emerald-500" />
                        System Life Tests
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Matrix Delivery Audit Dashboard</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {suites.map((suite) => (
                        <SuiteCard
                            key={suite.id}
                            suite={suite}
                            isRunning={isRunning && activeSuiteId === suite.id}
                            disabled={isRunning && activeSuiteId !== suite.id}
                            onRun={() => handleRun(suite.id)}
                        />
                    ))}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={() => handleRun('all')}
                        disabled={isRunning}
                        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isRunning
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                            }`}
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Run All Tests
                    </button>
                </div>
            </div>

            {/* Main Content / Terminal */}
            <div className="flex-1 flex flex-col bg-slate-950">
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/30">
                    <div className="flex items-center gap-2">
                        <TerminalIcon className="w-5 h-5 text-slate-400" />
                        <span className="font-mono text-sm text-slate-300">Live Execution Log</span>
                    </div>
                    {isRunning && (
                        <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 text-sm font-medium transition-colors"
                        >
                            <Square className="w-3 h-3 fill-current" />
                            Stop Execution
                        </button>
                    )}
                </div>

                <div className="flex-1 relative">
                    <Terminal socket={socketRef.current} />
                </div>
            </div>
        </div>
    )
}

export default App
