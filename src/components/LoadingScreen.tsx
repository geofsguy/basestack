import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Cpu, Layout, Type, Palette, Globe, CheckCircle2 } from 'lucide-react';
import Logo from './Logo';

const statusSteps = [
  { id: 'profile', label: "Analyzing your profile", icon: Cpu },
  { id: 'layout', label: "Drafting custom layout", icon: Layout },
  { id: 'copy', label: "Writing professional copy", icon: Type },
  { id: 'styling', label: "Applying design tokens", icon: Palette },
  { id: 'polishing', label: "Polishing pixels", icon: Sparkles },
  { id: 'finalizing', label: "Finalizing details", icon: Globe }
];

export default function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev < statusSteps.length - 1 ? prev + 1 : prev));
    }, 3500);

    const dotInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => {
      clearInterval(stepInterval);
      clearInterval(dotInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />
      
      {/* Animated Scanning Line */}
      <motion.div 
        initial={{ top: '-10%' }}
        animate={{ top: '110%' }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent z-10"
      />

      <div className="flex flex-col items-center z-20 max-w-md w-full">
        {/* Animated Logo Container */}
        <div className="relative mb-12">
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="relative z-10"
          >
            <Logo className="w-20 h-20 text-black" />
          </motion.div>
          {/* Pulsing ring around logo */}
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            className="absolute inset-0 border-2 border-black/20 rounded-full"
          />
        </div>

        {/* Main Title */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">Generating your site</h2>
          <p className="text-gray-400 text-sm font-medium">BaseStack AI is crafting your digital presence{dots}</p>
        </div>

        {/* Status Checklist */}
        <div className="w-full space-y-3 bg-white border border-gray-100 rounded-[2rem] p-8 shadow-xl shadow-black/[0.02]">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div 
                key={step.id} 
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98]'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-500 ${
                  isCompleted ? 'bg-black border-black text-white' : 
                  isActive ? 'bg-gray-50 border-gray-200 text-black' : 
                  'bg-transparent border-gray-100 text-gray-300'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium transition-colors duration-500 ${
                    isActive ? 'text-gray-900' : isCompleted ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-300'
                  }`}>
                    {step.label}
                  </p>
                </div>
                {isActive && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-4 h-4 border-2 border-gray-200 border-t-black rounded-full"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Percentage / Progress Bar */}
        <div className="mt-12 w-full px-4">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Total Progress</span>
            <span className="text-[11px] font-bold text-gray-900">{Math.round(((currentStep + 1) / statusSteps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / statusSteps.length) * 100}%` }}
              className="h-full bg-black"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

