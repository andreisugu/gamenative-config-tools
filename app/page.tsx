import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Title */}
        <h1 className="text-6xl font-bold mb-16 text-center protected-gradient-title leading-tight">
          GameNative Config Tools
        </h1>

        {/* Three Main Tool Links */}
        <div className="space-y-4 mb-12">
          <Link
            href="/config-converter"
            className="block w-full bg-gray-800/50 hover:bg-gray-800/70 border-2 border-gray-700 hover:border-cyan-500 rounded-xl p-6 transition-all transform hover:scale-105 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🔄</span>
              <div>
                <h2 className="text-2xl font-bold text-cyan-400">Config Converter</h2>
                <p className="text-gray-400 text-sm mt-1">Convert raw configurations into usable GameNative game configurations</p>
              </div>
            </div>
          </Link>

          <Link
            href="/config-editor"
            className="block w-full bg-gray-800/50 hover:bg-gray-800/70 border-2 border-gray-700 hover:border-cyan-500 rounded-xl p-6 transition-all transform hover:scale-105 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">✏️</span>
              <div>
                <h2 className="text-2xl font-bold text-cyan-400">Config Editor</h2>
                <p className="text-gray-400 text-sm mt-1">Visual editor for fine-tuning GameNative configurations</p>
              </div>
            </div>
          </Link>

          <Link
            href="/config-browser"
            className="block w-full bg-gray-800/50 hover:bg-gray-800/70 border-2 border-gray-700 hover:border-cyan-500 rounded-xl p-6 transition-all transform hover:scale-105 backdrop-blur-sm"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🔍</span>
              <div>
                <h2 className="text-2xl font-bold text-cyan-400">Config Browser</h2>
                <p className="text-gray-400 text-sm mt-1">Browse and search community-submitted game configurations</p>
              </div>
            </div>
          </Link>
        </div>

        {/* External Links */}
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://github.com/andreisugu/gamenative-config-tools"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 protected-button-cyan text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95"
          >
            GitHub
          </a>
          <a
            href="https://gamenative.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 protected-button-cyan text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95"
          >
            GameNative
          </a>
          <a
            href="https://discord.gg/2hKv4VfZfE"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 protected-button-cyan text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95"
          >
            Discord
          </a>
        </div>
      </div>
    </div>
  );
}
