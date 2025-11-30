import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TheorySection } from '@/components/TheorySection';
import { SimulatorSection } from '@/components/SimulatorSection';
import { Button } from '@/components/ui/button';
import { BookOpen, Map, Github } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, MAP_ID } from '@/lib/maps-constants';

type ActiveTab = 'theory' | 'simulator';

const Index = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('theory');

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐜</span>
            <h1 className="font-bold text-lg text-foreground hidden sm:block">
              ACO Simulator
            </h1>
          </div>
          
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              className={`nav-tab ${activeTab === 'theory' ? 'active' : ''}`}
              onClick={() => setActiveTab('theory')}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Teoría
            </Button>
            <Button
              id="to-app"
              variant="ghost"
              className={`nav-tab ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulator')}
            >
              <Map className="w-4 h-4 mr-2" />
              Simulador
            </Button>
          </nav>
          
          <div className="hidden sm:flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-16">
        <AnimatePresence mode="wait">
          {activeTab === 'theory' ? (
            <motion.div
              key="theory"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <TheorySection onGoToSimulator={() => setActiveTab('simulator')} />
            </motion.div>
          ) : (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SimulatorSection />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border py-4 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            Simulador ACO-TSP para ESPOL | Rutas peatonales reales
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono">API Key: {GOOGLE_MAPS_API_KEY.slice(0, 10)}...</span>
            <span className="font-mono">Map ID: {MAP_ID.slice(0, 10)}...</span>
          </div>
          <p className="text-destructive/70">
            ⚠️ Las credenciales son para pruebas locales únicamente
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
