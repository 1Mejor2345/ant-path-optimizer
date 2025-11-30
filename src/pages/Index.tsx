import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TheorySection } from '@/components/TheorySection';
import { SimulatorSection } from '@/components/SimulatorSection';
import { Button } from '@/components/ui/button';
import { BookOpen, Map, Bug } from 'lucide-react';

type ActiveTab = 'theory' | 'simulator';

const Index = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('theory');

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Fixed Navigation */}
      <header className="flex-shrink-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="h-full max-w-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐜</span>
            <h1 className="font-bold text-lg text-foreground hidden sm:block">
              ACO-TSP ESPOL
            </h1>
          </div>
          
          <nav className="flex items-center gap-1">
            <Button
              variant={activeTab === 'theory' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('theory')}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Teoria</span>
            </Button>
            <Button
              id="to-app"
              variant={activeTab === 'simulator' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('simulator')}
              className="gap-2"
            >
              <Bug className="w-4 h-4" />
              <span className="hidden sm:inline">Simulador</span>
            </Button>
          </nav>
          
          <div className="text-xs text-muted-foreground hidden md:block">
            Rutas peatonales reales
          </div>
        </div>
      </header>
      
      {/* Main Content - fills remaining height */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'theory' ? (
            <motion.div
              key="theory"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-auto"
            >
              <TheorySection onGoToSimulator={() => setActiveTab('simulator')} />
            </motion.div>
          ) : (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <SimulatorSection />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;
