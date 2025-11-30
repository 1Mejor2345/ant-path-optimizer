import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Code, Lightbulb, Clock, Zap } from 'lucide-react';

interface TheorySectionProps {
  onGoToSimulator: () => void;
}

export function TheorySection({ onGoToSimulator }: TheorySectionProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="inline-flex items-center gap-2 bg-accent/50 text-accent-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="ant-emoji">🐜</span>
            Simulador Pedagógico ACO-TSP
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            El Cerebro de la{' '}
            <span className="gradient-hero bg-clip-text text-transparent">
              Colonia de Hormigas
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Descubre cómo las hormigas resuelven el Problema del Agente Viajero usando 
            inteligencia colectiva y matemáticas discretas.
          </p>
          
          <Button variant="hero" size="xl" onClick={onGoToSimulator}>
            Ir al Simulador <ArrowRight className="ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-16">
          
          {/* ACO Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="gradient-card rounded-2xl p-8 border border-border"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  ¿Qué es el Algoritmo de Colonia de Hormigas?
                </h2>
                <p className="text-muted-foreground">
                  Un algoritmo metaheurístico inspirado en el comportamiento de las hormigas reales
                </p>
              </div>
            </div>
            
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p>
                El <strong>Ant Colony Optimization (ACO)</strong> es una técnica de optimización 
                inspirada en cómo las hormigas encuentran caminos cortos entre su colonia y las 
                fuentes de alimento. Las hormigas depositan <em>feromonas</em> en el camino, y 
                otras hormigas tienden a seguir los caminos con más feromonas.
              </p>
              
              <p>
                En el <strong>Problema del Agente Viajero (TSP)</strong>, buscamos la ruta más 
                corta que visite todos los nodos exactamente una vez y regrese al origen. ACO 
                lo resuelve mediante agentes (hormigas virtuales) que construyen soluciones 
                probabilísticamente.
              </p>
            </div>
          </motion.div>

          {/* Formula */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="gradient-card rounded-2xl p-8 border border-border"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-secondary/10">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  La Fórmula de Decisión
                </h2>
                <p className="text-muted-foreground">
                  Cómo cada hormiga decide su siguiente movimiento
                </p>
              </div>
            </div>
            
            <div className="formula-box text-center text-lg md:text-xl mb-6">
              <div className="mb-4">
                <span className="text-primary font-bold">P<sub>ij</sub></span> = 
                <span className="mx-2">(τ<sub>ij</sub><sup>α</sup> · η<sub>ij</sub><sup>β</sup>)</span> / 
                <span className="ml-2">Σ<sub>k</sub> (τ<sub>ik</sub><sup>α</sup> · η<sub>ik</sub><sup>β</sup>)</span>
              </div>
              <div className="text-sm text-muted-foreground">
                donde <strong>η<sub>ij</sub> = 1 / d<sub>ij</sub></strong> (heurística = inverso de la distancia)
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Variables:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><code className="text-primary">τ<sub>ij</sub></code> — Nivel de feromona en arista (i,j)</li>
                  <li><code className="text-primary">η<sub>ij</sub></code> — Heurística (1/distancia)</li>
                  <li><code className="text-primary">α</code> — Peso de las feromonas</li>
                  <li><code className="text-primary">β</code> — Peso de la heurística</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Interpretación:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• α alto → preferencia por caminos muy transitados</li>
                  <li>• β alto → preferencia por caminos cortos</li>
                  <li>• Balance α/β = equilibrio exploración/explotación</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Functions Mapping */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="gradient-card rounded-2xl p-8 border border-border"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Funciones del Algoritmo
                </h2>
                <p className="text-muted-foreground">
                  Conexión entre la teoría y la implementación
                </p>
              </div>
            </div>
            
            <div className="grid gap-4">
              {[
                { name: 'inicializarFeromonas()', desc: 'Crea la matriz τ con valores iniciales uniformes' },
                { name: 'inicializarHormigas()', desc: 'Prepara k hormigas en el nodo de inicio' },
                { name: 'seleccionarSiguienteNodo()', desc: 'Aplica la fórmula P_ij para elegir el próximo nodo' },
                { name: 'calcularLongitudRuta()', desc: 'Suma las distancias del tour construido' },
                { name: 'depositarFeromonas()', desc: 'Aplica Δτ = Q/L a las aristas visitadas' },
                { name: 'evaporarFeromonas()', desc: 'Aplica τ ← (1-ρ)·τ en toda la matriz' },
                { name: 'actualizarFeromonas()', desc: 'Evapora y luego deposita (ciclo completo)' },
                { name: 'ejecutarACO()', desc: 'Orquesta el algoritmo completo por iteraciones' },
              ].map((fn, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <code className="text-primary font-mono text-sm flex-shrink-0">{fn.name}</code>
                  <span className="text-sm text-muted-foreground">{fn.desc}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Guide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="gradient-card rounded-2xl p-8 border border-border"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-ant/10">
                <Lightbulb className="w-6 h-6 text-ant" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Guía Rápida para la Exposición
                </h2>
                <p className="text-muted-foreground">
                  Puntos clave para cubrir en 15 minutos
                </p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground">Minutos 0-3</h4>
                    <p className="text-sm text-muted-foreground">
                      Introducción al TSP y por qué es NP-difícil
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground">Minutos 3-6</h4>
                    <p className="text-sm text-muted-foreground">
                      Inspiración biológica: feromonas y comportamiento colectivo
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground">Minutos 6-9</h4>
                    <p className="text-sm text-muted-foreground">
                      La fórmula P_ij — demostración con modo paso-a-paso
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-secondary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground">Minutos 9-12</h4>
                    <p className="text-sm text-muted-foreground">
                      Ejecución completa: ver convergencia y mapa de feromonas
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-secondary mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground">Minutos 12-15</h4>
                    <p className="text-sm text-muted-foreground">
                      Comparación con heurísticas (NN, 2-opt) y conclusiones
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center py-8"
          >
            <Button variant="hero" size="xl" onClick={onGoToSimulator}>
              <span className="ant-emoji mr-2">🐜</span>
              Comenzar Simulación
              <ArrowRight className="ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
