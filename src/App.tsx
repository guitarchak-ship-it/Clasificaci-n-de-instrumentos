import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import { 
  Music, 
  Trophy, 
  RefreshCcw, 
  ArrowRight, 
  Volume2, 
  Image as ImageIcon, 
  Layers, 
  Star,
  CheckCircle2,
  XCircle,
  Download,
  Mail,
} from "lucide-react";
import confetti from "canvas-confetti";
import { INSTRUMENTS, Instrument, OrganologicalFamily, OrchestralFamily, BasicFamily, InstrumentTier } from "./data/instruments";

// --- Types ---
type GameState = "START" | "LEVEL_TRANSITION" | "PLAYING" | "SUMMARY";
type QuestionType = "NAME" | "BASIC_FAMILY" | "ORGANOLOGICAL" | "ORCHESTRAL" | "SOUND" | "MIXED";

interface LevelConfig {
  id: number;
  title: string;
  description: string;
  count: number;
  tier: InstrumentTier;
  type: QuestionType;
}

const LEVELS: LevelConfig[] = [
  // FÁCIL: Common tools, Basic classification (WIND, STRINGS, PERCUSSION)
  { id: 1, title: "1. Visual Inicial", description: "Identifica instrumentos comunes por su imagen.", count: 5, tier: InstrumentTier.EASY, type: "NAME" },
  { id: 2, title: "2. Familias de Siempre", description: "¿Viento, Cuerda o Percusión?", count: 5, tier: InstrumentTier.EASY, type: "BASIC_FAMILY" },
  { id: 3, title: "3. Sonidos Familiares", description: "Reconoce el instrumento por su sonido habitual.", count: 5, tier: InstrumentTier.EASY, type: "SOUND" },
  { id: 4, title: "4. Repaso Inicial", description: "Mezcla de todo lo básico.", count: 5, tier: InstrumentTier.EASY, type: "MIXED" },
  
  // MEDIO: Artisanal tools, Organological classification
  { id: 5, title: "5. Mundo Artesanal", description: "Instrumentos folclóricos y tradicionales.", count: 5, tier: InstrumentTier.MEDIUM, type: "NAME" },
  { id: 6, title: "6. Sistema Organológico", description: "Cordófonos, Aerófonos, Idiófonos...", count: 5, tier: InstrumentTier.MEDIUM, type: "ORGANOLOGICAL" },
  { id: 7, title: "7. Oído Tradicional", description: "Identifica sonidos de instrumentos artesanales.", count: 5, tier: InstrumentTier.MEDIUM, type: "SOUND" },
  { id: 8, title: "8. Desafío Intermedio", description: "Consolida el conocimiento organológico.", count: 5, tier: InstrumentTier.MEDIUM, type: "MIXED" },

  // AVANZADO: Orchestral tools, Sub-categories
  { id: 9, title: "9. La Gran Orquesta", description: "Instrumentos específicos de la orquesta filarmónica.", count: 5, tier: InstrumentTier.ADVANCED, type: "NAME" },
  { id: 10, title: "10. Precisiones Orquestales", description: "Viento metal, madera, cuerdas frotadas, etc.", count: 5, tier: InstrumentTier.ADVANCED, type: "ORCHESTRAL" },
  { id: 11, title: "11. Maestría Auditiva", description: "Sonidos de orquesta complejos.", count: 5, tier: InstrumentTier.ADVANCED, type: "SOUND" },
  { id: 12, title: "12. Maestro Supremo", description: "El examen final de clasificación musical.", count: 10, tier: InstrumentTier.ADVANCED, type: "MIXED" },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>("START");
  const [studentName, setStudentName] = useState("");
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<Instrument[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>("NAME");
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentLevel = LEVELS[currentLevelIndex];

  // --- Audio Control ---
  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlayingSound(false);
    }
  };

  const playInstrumentSound = (url?: string) => {
    if (!url) return;
    
    // Stop current sound if playing
    stopSound();

    const audio = new Audio(url);
    audio.loop = true; // Loop as requested
    audioRef.current = audio;
    
    setIsPlayingSound(true);
    audio.play().catch(err => console.error("Audio playback error:", err));
  };

  // --- Effects ---
  useEffect(() => {
    // Cleanup audio on unmount
    return () => stopSound();
  }, []);

  useEffect(() => {
    if (gameState === "PLAYING") {
      const levelInstruments = [...INSTRUMENTS]
        .filter(i => i.tier === currentLevel.tier)
        .sort(() => Math.random() - 0.5)
        .slice(0, currentLevel.count);
      
      // If not enough instruments in tier, add from others
      if (levelInstruments.length < currentLevel.count) {
        const remaining = [...INSTRUMENTS]
          .filter(i => !levelInstruments.includes(i))
          .sort(() => Math.random() - 0.5)
          .slice(0, currentLevel.count - levelInstruments.length);
        levelInstruments.push(...remaining);
      }

      setSessionQuestions(levelInstruments);
      setCurrentQuestionIndex(0);
      determineAndGenerateOptions(levelInstruments[0], currentLevel);
    }
  }, [currentLevelIndex, gameState]);

  const determineAndGenerateOptions = (correctInstrument: Instrument, level: LevelConfig) => {
    let type = level.type;

    if (type === "MIXED") {
      const types: QuestionType[] = ["NAME", "SOUND"];
      if (level.tier === InstrumentTier.EASY) types.push("BASIC_FAMILY");
      if (level.tier === InstrumentTier.MEDIUM) types.push("ORGANOLOGICAL");
      if (level.tier === InstrumentTier.ADVANCED) types.push("ORCHESTRAL");
      type = types[Math.floor(Math.random() * types.length)];
    }
    
    setCurrentQuestionType(type);
    
    if (type === "NAME" || type === "SOUND") {
      const distractors = INSTRUMENTS
        .filter(i => i.id !== correctInstrument.id)
        .map(i => i.name);
      
      const randomDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
      setOptions([...randomDistractors, correctInstrument.name].sort(() => Math.random() - 0.5));
    } else if (type === "BASIC_FAMILY") {
      const correctValue = correctInstrument.basicFamily;
      const possibleFamilies = Object.values(BasicFamily);
      const filteredDistractors = possibleFamilies.filter(d => d !== correctValue);
      setOptions([...filteredDistractors, correctValue].sort(() => Math.random() - 0.5));
    } else if (type === "ORGANOLOGICAL") {
      const correctValue = correctInstrument.organologicalFamily;
      const possibleFamilies = Object.values(OrganologicalFamily);
      const filteredDistractors = possibleFamilies.filter(d => d !== correctValue);
      const randomOptions = [...filteredDistractors].sort(() => Math.random() - 0.5).slice(0, 3);
      setOptions([...randomOptions, correctValue].sort(() => Math.random() - 0.5));
    } else if (type === "ORCHESTRAL") {
      const correctValue = correctInstrument.orchestralFamily;
      const possibleFamilies = Object.values(OrchestralFamily);
      const filteredDistractors = possibleFamilies.filter(d => d !== correctValue);
      const randomOptions = [...filteredDistractors].sort(() => Math.random() - 0.5).slice(0, 3);
      setOptions([...randomOptions, correctValue].sort(() => Math.random() - 0.5));
    }
  };

  const handleAnswer = (answer: string) => {
    if (feedback) return;

    const correctInstrument = sessionQuestions[currentQuestionIndex];
    const isCorrect = (currentQuestionType === "NAME" || currentQuestionType === "SOUND") 
      ? answer === correctInstrument.name
      : (answer === correctInstrument.organologicalFamily) || 
        (answer === correctInstrument.orchestralFamily) ||
        (answer === correctInstrument.basicFamily);

    let explanation = "";

    if (isCorrect) {
      setScore(s => s + 10);
      setCorrectAnswers(c => c + 1);
      explanation = (answer === correctInstrument.name) 
        ? `¡Correcto! Es un ${correctInstrument.name}.`
        : `¡Bien hecho! El ${correctInstrument.name} pertenece a la familia de los ${answer}.`;
      setFeedback({ isCorrect: true, message: explanation });
      // Play correct sound
      new Audio("/sounds/correct.mp3").play().catch(() => {});
    } else {
      explanation = `Lo siento, el instrumento es un ${correctInstrument.name}. Es un ${correctInstrument.basicFamily.toLowerCase()}, de tipo ${correctInstrument.organologicalFamily.toLowerCase()} (${correctInstrument.orchestralFamily.toLowerCase()}).`;
      setFeedback({ isCorrect: false, message: explanation });
      // Play incorrect sound
      new Audio("/sounds/incorrect.mp3").play().catch(() => {});
    }
    
    setTotalAttempted(t => t + 1);
  };

  const nextQuestion = () => {
    setFeedback(null);
    stopSound();
    
    if (currentQuestionIndex < sessionQuestions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      determineAndGenerateOptions(sessionQuestions[nextIdx], currentLevel);
    } else {
      if (currentLevelIndex < LEVELS.length - 1) {
        setGameState("LEVEL_TRANSITION");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        setGameState("SUMMARY");
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 }
        });
      }
    }
  };

  const startNextLevel = () => {
    stopSound();
    setCurrentLevelIndex(i => i + 1);
    setGameState("PLAYING");
  };

  const restartGame = () => {
    stopSound();
    setCurrentLevelIndex(0);
    setCurrentQuestionIndex(0);
    setScore(0);
    setCorrectAnswers(0);
    setTotalAttempted(0);
    setFeedback(null);
    setGameState("START");
  };

  if (gameState === "START") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-indigo-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full brutal-card text-center space-y-4"
        >
          <div className="inline-flex mb-2">
            <img src="/icono.png" alt="Icono" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter">LOS INSTRUMENTOS MUSICALES</h1>
          <p className="text-lg text-zinc-600 font-medium">
            Test Interactivo de Clasificación Musical
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <li className="list-none p-2 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-28">
              <img src="/vista_y_oido.png" alt="Vista y Oído" className="w-full h-full object-cover" />
            </li>
            <li className="list-none p-2 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-28">
              <img src="/ciencia_musical.png" alt="Ciencia Musical" className="w-full h-full object-cover" />
            </li>
          </div>
          <div className="space-y-2 text-left">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500">Tu Nombre:</label>
            <input 
              type="text" 
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Ingresa tu nombre aquí..."
              className="w-full p-3 text-lg font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-yellow-50"
            />
          </div>
          <button 
            onClick={() => studentName.trim() && setGameState("PLAYING")}
            disabled={!studentName.trim()}
            className="brutal-button w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ¡Comenzar Juego!
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === "LEVEL_TRANSITION") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-indigo-600">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full brutal-card text-center space-y-4"
        >
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
          <h2 className="text-2xl font-black">¡NIVEL COMPLETADO!</h2>
          <p className="text-base font-medium">Has superado el {currentLevel.title}.</p>
          <div className="py-3 px-4 bg-zinc-100 border-2 border-black">
            <p className="text-zinc-500 uppercase text-[10px] font-black tracking-widest mb-1">Siguiente:</p>
            <p className="text-lg font-bold text-indigo-700">{LEVELS[currentLevelIndex + 1].title}</p>
          </div>
          <button 
            onClick={startNextLevel}
            className="brutal-button w-full flex items-center justify-center gap-2 py-3"
          >
            Siguiente Nivel <ArrowRight />
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === "SUMMARY") {
    const achievementPercentage = totalAttempted > 0 ? Math.round((correctAnswers / totalAttempted) * 100) : 0;
    
    let percentageColor = "text-red-600";
    if (achievementPercentage === 100) percentageColor = "text-green-600";
    else if (achievementPercentage >= 60) percentageColor = "text-yellow-600";

    const downloadPDFReport = () => {
      // ... (no changes needed to PDF logic)
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      doc.setFillColor(79, 70, 229); 
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTE DE LOGRO", 105, 25, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`Fecha: ${date}`, 20, 50);
      doc.setFontSize(18);
      doc.text("Estudiante:", 20, 65);
      doc.setFontSize(26);
      doc.text(studentName, 20, 80);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(20, 90, 190, 90);
      doc.setFontSize(16);
      doc.text("Resumen de Actividad:", 20, 105);
      doc.setFontSize(14);
      doc.text(`- Puntaje Total: ${score} puntos`, 30, 120);
      doc.text(`- Aciertos: ${correctAnswers} de ${totalAttempted}`, 30, 130);
      doc.text(`- Porcentaje de Logro: ${achievementPercentage}%`, 30, 140);
      let statusText = "Requiere Refuerzo";
      if (achievementPercentage === 100) statusText = "¡Excelente - Maestro Musical!";
      else if (achievementPercentage >= 60) statusText = "Buen Trabajo - Aprobado";
      doc.setFontSize(18);
      doc.text("Estado:", 20, 160);
      doc.setFontSize(22);
      doc.text(statusText, 20, 175);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Generado por LOS INSTRUMENTOS MUSICALES - Juego Educativo Musical", 105, 280, { align: "center" });
      doc.save(`Reporte_Musical_${studentName.replace(/\s+/g, '_')}.pdf`);
    };

    const shareByEmail = () => {
      const subject = `Reporte de Logro Musical - ${studentName}`;
      const body = `Hola,\n\nSoy ${studentName} y he completado el juego LOS INSTRUMENTOS MUSICALES.\n\n` +
        `Mis resultados:\n` +
        `- Puntaje: ${score}\n` +
        `- Logro: ${achievementPercentage}%\n` +
        `- Aciertos: ${correctAnswers} de ${totalAttempted}\n\n` +
        `¡Sigue aprendiendo sobre instrumentos musicales!`;
      
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-900">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-lg w-full brutal-card text-center space-y-4 p-6"
        >
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
          <div>
            <h2 className="text-3xl font-black mb-1 uppercase tracking-tighter">{studentName}</h2>
            <h2 className="text-xl font-black mb-1 text-zinc-400">¡RETO COMPLETADO!</h2>
            <p className="text-sm text-zinc-600 font-medium">Has dominado la clasificación de instrumentos.</p>
          </div>
          <div className="flex justify-center gap-6 py-4 border-y-2 border-black border-dashed">
            <div>
              <p className="text-2xl font-black text-indigo-600">{score}</p>
              <p className="text-[10px] font-black uppercase text-zinc-400">Puntaje</p>
            </div>
            <div>
              <p className={`text-2xl font-black ${percentageColor}`}>{achievementPercentage}%</p>
              <p className="text-[10px] font-black uppercase text-zinc-400">Logro</p>
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-800">{correctAnswers}/{totalAttempted}</p>
              <p className="text-[10px] font-black uppercase text-zinc-400">Aciertos</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={downloadPDFReport}
              className="brutal-button bg-green-600 w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <Download className="w-4 h-4" /> Descargar Reporte PDF
            </button>
            <button 
              onClick={shareByEmail}
              className="brutal-button bg-blue-500 w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <Mail className="w-4 h-4" /> Compartir por Correo
            </button>
            <button 
              onClick={restartGame}
              className="brutal-button-secondary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <RefreshCcw className="w-4 h-4" /> Jugar de nuevo
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = sessionQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-zinc-50 p-2 md:p-4 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-5xl mx-auto mb-4 bg-black text-white p-2 brutal-border flex flex-row justify-between items-center gap-4">
        <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Estudiante:</span>
        <h2 className="text-xl md:text-3xl font-black truncate max-w-[200px] md:max-w-md">{studentName}</h2>
      </div>
      <header className="max-w-5xl mx-auto flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 max-w-sm">
          <div className="flex justify-between items-end mb-1">
             <h2 className="text-sm font-black uppercase tracking-tight text-indigo-700">{currentLevel.title}</h2>
             <span className="text-xs font-bold text-zinc-400">{currentQuestionIndex + 1} / {sessionQuestions.length}</span>
          </div>
          <div className="h-3 w-full bg-zinc-200 border-2 border-black overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / sessionQuestions.length) * 100}%` }}
              className="h-full bg-indigo-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-black text-lg">{score}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white border-4 border-black p-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-[280px] mx-auto w-full"
            >
              <div className="aspect-square bg-zinc-100 mb-4 border-2 border-black overflow-hidden relative group">
                {currentQuestionType === "SOUND" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-indigo-50">
                    <button 
                      onClick={() => playInstrumentSound(currentQuestion.sound)}
                      className={`w-32 h-32 rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${isPlayingSound ? "bg-green-500 translate-x-1 translate-y-1 shadow-none" : "bg-indigo-600 hover:bg-indigo-700"}`}
                      disabled={isPlayingSound}
                    >
                      {isPlayingSound ? (
                        <div className="flex gap-2 items-center">
                          {[1,2,3,4].map(i => (
                            <motion.div 
                              key={i}
                              animate={{ scaleY: [1, 2, 1] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                              className="w-1.5 h-6 bg-white rounded-full"
                            />
                          ))}
                        </div>
                      ) : (
                        <Volume2 className="w-16 h-16 text-white" />
                      )}
                    </button>
                    <p className="mt-4 text-xs font-black uppercase text-indigo-700 tracking-wider">Presiona para escuchar</p>
                  </div>
                ) : (
                  <img 
                    src={currentQuestion?.image} 
                    alt="Instrumento" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain grayscale-0 group-hover:scale-105 transition-transform duration-500"
                  />
                )}
              </div>
              <div className="space-y-1">
                <span className="inline-block bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  Pregunta {currentQuestionIndex + 1} de {currentLevel.count}
                </span>
                <h3 className="text-xl font-black leading-tight">
                  {(currentQuestionType === "NAME" || currentQuestionType === "SOUND") 
                    ? "¿Cuál es este instrumento?" 
                    : "¿A qué familia pertenece?"}
                </h3>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {options.map((option, idx) => (
              <motion.button
                key={`${currentQuestionIndex}-${idx}`}
                whileHover={{ scale: feedback ? 1 : 1.01 }}
                whileTap={{ scale: feedback ? 1 : 0.99 }}
                onClick={() => handleAnswer(option)}
                disabled={!!feedback}
                className={`w-full text-left p-3 font-black text-lg border-4 border-black transition-all flex items-center justify-between
                  ${feedback ? (
                    ((currentQuestionType === "NAME" || currentQuestionType === "SOUND") && option === currentQuestion?.name) ||
                    (currentQuestionType === "BASIC_FAMILY" && option === currentQuestion?.basicFamily) ||
                    (currentQuestionType === "ORGANOLOGICAL" && option === currentQuestion?.organologicalFamily) ||
                    (currentQuestionType === "ORCHESTRAL" && option === currentQuestion?.orchestralFamily)
                    ? "bg-green-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                    : (feedback && !feedback.isCorrect && (
                        (currentQuestionType === "NAME" || currentQuestionType === "SOUND") ? option === currentQuestion?.name :
                        (currentQuestionType === "BASIC_FAMILY") ? option === currentQuestion?.basicFamily :
                        (currentQuestionType === "ORGANOLOGICAL") ? option === currentQuestion?.organologicalFamily :
                        (currentQuestionType === "ORCHESTRAL") ? option === currentQuestion?.orchestralFamily : false
                      )) ? "bg-white opacity-40 shadow-none" : "bg-red-500 text-white"
                  ) : "bg-white hover:bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}
                `}
              >
                {option}
                {feedback && (
                  ((currentQuestionType === "NAME" || currentQuestionType === "SOUND") && option === currentQuestion?.name) ||
                  (currentQuestionType === "BASIC_FAMILY" && option === currentQuestion?.basicFamily) ||
                  (currentQuestionType === "ORGANOLOGICAL" && option === currentQuestion?.organologicalFamily) ||
                  (currentQuestionType === "ORCHESTRAL" && option === currentQuestion?.orchestralFamily)
                ) && (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </main>

      {/* Feedback Popup Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`max-w-xl w-full p-8 border-4 border-black border-dashed shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${feedback.isCorrect ? "bg-green-50" : "bg-red-50"}`}
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className={`p-4 border-4 border-black self-center md:self-start shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${feedback.isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                  {feedback.isCorrect ? <CheckCircle2 className="text-white w-12 h-12" /> : <XCircle className="text-white w-12 h-12" />}
                </div>
                <div className="flex-1 space-y-6 text-center md:text-left">
                  <div>
                    <h2 className="text-4xl font-black uppercase mb-1 tracking-tighter">
                      {feedback.isCorrect ? "¡Excelente!" : "¡Sigue practicando!"}
                    </h2>
                    <p className="text-xl font-bold text-zinc-900 border-b-2 border-black/10 pb-4 inline-block">
                      {feedback.message}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-900 text-zinc-200 border-2 border-black rotate-1">
                    <p className="text-lg font-medium leading-relaxed">
                      <span className="text-yellow-400 font-black">TIP MUSICAL:</span> {currentQuestion?.description}
                    </p>
                  </div>
                  <button 
                    onClick={nextQuestion}
                    className="brutal-button w-full flex items-center justify-center gap-2 py-4 text-2xl"
                  >
                    {currentQuestionIndex < sessionQuestions.length - 1 ? "Siguiente Pregunta" : "Ver Resultados"} <ArrowRight />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
