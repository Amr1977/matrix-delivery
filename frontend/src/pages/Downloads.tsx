import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Smartphone, Monitor, Apple, Terminal, ChevronLeft } from 'lucide-react';

const platforms = [
  {
    id: 'android',
    name: 'Android',
    icon: <Smartphone className="w-8 h-8" />,
    description: 'APK for Android 7.0+',
    file: 'MatrixDelivery.apk',
    size: '~45 MB',
    gradient: 'from-[#00FF41] to-[#00F0FF]',
    color: '#00FF41',
  },
  {
    id: 'windows',
    name: 'Windows',
    icon: <Monitor className="w-8 h-8" />,
    description: 'EXE installer for Windows 10+',
    file: 'MatrixDelivery-Setup.exe',
    size: '~85 MB',
    gradient: 'from-[#00F0FF] to-[#B026FF]',
    color: '#00F0FF',
  },
  {
    id: 'mac',
    name: 'macOS',
    icon: <Apple className="w-8 h-8" />,
    description: 'DMG for macOS 11+ (Intel & Apple Silicon)',
    file: 'MatrixDelivery.dmg',
    size: '~90 MB',
    gradient: 'from-[#B026FF] to-[#FFB800]',
    color: '#B026FF',
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: <Terminal className="w-8 h-8" />,
    description: 'AppImage for x86_64 Linux',
    file: 'MatrixDelivery-x86_64.AppImage',
    size: '~80 MB',
    gradient: 'from-[#FFB800] to-[#FF6B00]',
    color: '#FFB800',
  },
];

const Downloads: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0E14] text-white">
      {/* Navbar */}
      <nav className="border-b border-[#2A3142] bg-[#131820]/90 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-[#A0AEC0] hover:text-[#00FF41] transition-colors bg-transparent border-0 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-mono">cd ..</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#00FF41] to-[#00F0FF] rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-[#0A0E14]" />
            </div>
            <h1 className="text-lg font-bold tracking-wider font-mono">DOWNLOADS</h1>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-16 pb-12 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <div className="inline-block px-4 py-1 bg-[#00FF41]/10 border border-[#00FF41] rounded-full mb-6">
            <span className="text-[#00FF41] text-sm font-semibold tracking-wider font-mono">
              $ wget matrix://download
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Get Matrix Delivery
          </h1>
          <p className="text-[#A0AEC0] text-lg max-w-xl mx-auto font-mono">
            Choose your platform. Open source. No trackers. No telemetry.
          </p>
        </div>
      </section>

      {/* Platform Cards */}
      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {platforms.map((p) => (
              <div
                key={p.id}
                className="relative group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${p.color}22, transparent)`,
                  }}
                />
                <div
                  className="relative border border-[#2A3142] rounded-xl p-6 bg-[#131820] hover:border-[#00FF41]/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${p.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <div className="text-[#0A0E14]">{p.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                      <p className="text-[#A0AEC0] text-sm mb-3">{p.description}</p>
                      <div className="flex items-center gap-3 text-xs text-[#004400] font-mono">
                        <span>{p.file}</span>
                        <span>•</span>
                        <span>{p.size}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg border border-[#2A3142] flex items-center justify-center group-hover:border-[#00FF41] group-hover:bg-[#00FF41]/10 transition-all">
                        <Download className="w-5 h-5 text-[#00FF41]" />
                      </div>
                    </div>
                  </div>
                  {/* Progress bar decoration */}
                  <div className="mt-4 h-1 bg-[#1E293B] rounded-full overflow-hidden">
                    <div className="h-full w-0 group-hover:w-full bg-gradient-to-r from-[#00FF41] to-[#00F0FF] transition-all duration-700 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Source / Info */}
          <div className="mt-12 text-center">
            <p className="text-[#004400] text-sm font-mono">
              $ shasum -a 256 MatrixDelivery-*.{'{apk,exe,dmg,AppImage}'}
            </p>
            <p className="text-[#004400] text-xs mt-2 font-mono">
              Checksums verified on build. Reproducible builds incoming.
            </p>
            <p className="mt-6 text-[#2A3142] text-xs">
              <a
                href="https://github.com/oldantique50/matrix-delivery/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#008F11] hover:text-[#00FF41] transition-colors"
              >
                View all releases on GitHub →
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Downloads;
