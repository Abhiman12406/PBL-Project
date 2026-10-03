import React from 'react';
import { PersonaProvider } from './context/PersonaContext';
import Navbar from './components/Navbar';
import DashboardShell from './components/DashboardShell';

function App() {
  return (
    <PersonaProvider>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-orange-500/20 selection:text-orange-950">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <DashboardShell />
        </main>
        <footer className="bg-white border-t-2 border-slate-200 px-6 py-4 text-center text-xs font-semibold text-slate-500">
          Cognitive Software-Driven Smart Logistics & Autonomous Freight Platform
        </footer>
      </div>
    </PersonaProvider>
  );
}

export default App;
