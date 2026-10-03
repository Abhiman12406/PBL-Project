import React from 'react';
import { PersonaProvider } from './context/PersonaContext';
import Navbar from './components/Navbar';
import DashboardShell from './components/DashboardShell';

function App() {
  return (
    <PersonaProvider>
      <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <DashboardShell />
        </main>
        <footer className="glass-panel border-t border-slate-800/80 px-6 py-3 text-center text-xs text-slate-500">
          Cognitive Software-Driven Smart Logistics & Multi-Agent Autonomous Corridor Platform
        </footer>
      </div>
    </PersonaProvider>
  );
}

export default App;
