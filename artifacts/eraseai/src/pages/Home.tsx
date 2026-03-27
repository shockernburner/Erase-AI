import { TeachSection } from "@/components/TeachSection";
import { AskSection } from "@/components/AskSection";
import { UnlearnSection } from "@/components/UnlearnSection";
import { VerifySection } from "@/components/VerifySection";
import { ShieldX } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen w-full pb-20 relative">
      {/* Abstract Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-12">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-10"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <ShieldX className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                EraseAI
              </h1>
              <p className="text-sm font-mono text-primary/80 uppercase tracking-widest mt-1">Machine Unlearning Demo</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            SYSTEM ONLINE
          </div>
        </motion.header>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Top Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4"
          >
            <TeachSection />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8"
          >
            <AskSection />
          </motion.div>

          {/* Bottom Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-4"
          >
            <UnlearnSection />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-8"
          >
            <VerifySection />
          </motion.div>

        </div>
      </div>
    </div>
  );
}
