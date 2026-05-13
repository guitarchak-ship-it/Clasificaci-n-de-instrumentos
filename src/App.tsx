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
import { INSTRUMENTS, Instrument, OrganologicalFamily, OrchestralFamily } from "./data/instruments";

// --- Types ---
type GameState = "START" | "LEVEL_TRANSITION" | "PLAYING" | "SUMMARY";

interface LevelConfig {
  id: number;
  title: string;
  description: string;
  count: number;
}

const LEVELS: LevelConfig[] = [
  { id: 1, title: "Nivel 1: Reconocimiento Visual", description: "Identifica el instrumento correcto según la imagen.", count: 3 },
  { id: 2, title: "Nivel 2: Familias de Instrumentos", description: "Clasifica los instrumentos en sus familias correspondientes.", count: 3 },
  { id: 3, title: "Nivel 3: Reconocimiento Sonoro", description: "Escucha el sonido e identifica qué instrumento es.", count: 3 },
  { id: 4, title: "Nivel 4: Desafío Maestro", description: "Pon a prueba todo lo aprendido en este reto final.", count: 4 },
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
      const levelInstruments = [...INSTRUMENTS].sort(() => Math.random() - 0.5).slice(0, currentLevel.count);
      setSessionQuestions(levelInstruments);
      setCurrentQuestionIndex(0);
      generateOptions(levelInstruments[0], currentLevelIndex);
    }
  }, [currentLevelIndex, gameState]);

  const generateOptions = (correctInstrument: Instrument, levelIdx: number) => {
    let distractors: string[] = [];
    
    // Level 1: Recognition by Image (Name)
    // Level 3: Recognition by Sound (Name)
    // Level 4: Mixed (might be name or family)
    if (levelIdx === 0 || levelIdx === 2 || (levelIdx === 3 && Math.random() > 0.5)) {
      distractors = INSTRUMENTS
        .filter(i => i.id !== correctInstrument.id)
        .map(i => i.name);
      
      const randomDistractors = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
      setOptions([...randomDistractors, correctInstrument.name].sort(() => Math.random() - 0.5));
    } else {
      // Level 2 & Part of Level 4: Classification
      const isOrganological = Math.random() > 0.5;
      const possibleFamilies = isOrganological 
        ? Object.values(OrganologicalFamily) 
        : Object.values(OrchestralFamily).filter(f => f !== OrchestralFamily.OTHER);
      
      const correctValue = isOrganological 
        ? correctInstrument.organologicalFamily 
        : correctInstrument.orchestralFamily;

      const filteredDistractors = possibleFamilies.filter(d => d !== correctValue);
      const randomOptions = [...filteredDistractors].sort(() => Math.random() - 0.5).slice(0, 3);
      setOptions([...randomOptions, (correctValue as string)].sort(() => Math.random() - 0.5));
    }
  };

  const handleAnswer = (answer: string) => {
    if (feedback) return;

    const correctInstrument = sessionQuestions[currentQuestionIndex];
    const isCorrect = (answer === correctInstrument.name) || 
                     (answer === correctInstrument.organologicalFamily) || 
                     (answer === correctInstrument.orchestralFamily);

    let explanation = "";

    if (isCorrect) {
      setScore(s => s + 10);
      setCorrectAnswers(c => c + 1);
      explanation = (answer === correctInstrument.name) 
        ? `¡Correcto! Es un ${correctInstrument.name}.`
        : `¡Bien hecho! El ${correctInstrument.name} pertenece a la familia de los ${answer}.`;
      setFeedback({ isCorrect: true, message: explanation });
    } else {
      explanation = `Lo siento, el instrumento es un ${correctInstrument.name}, que es un ${correctInstrument.organologicalFamily} (${correctInstrument.orchestralFamily.toLowerCase()}).`;
      setFeedback({ isCorrect: false, message: explanation });
    }
    
    setTotalAttempted(t => t + 1);
  };

  const nextQuestion = () => {
    setFeedback(null);
    stopSound();
    
    if (currentQuestionIndex < sessionQuestions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      generateOptions(sessionQuestions[nextIdx], currentLevelIndex);
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-indigo-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full brutal-card text-center space-y-8"
        >
          <div className="inline-flex p-4 bg-indigo-200 rounded-full mb-4">
            <Music className="w-12 h-12 text-indigo-700" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">Armonía en Clasificación</h1>
          <p className="text-xl text-zinc-600 font-medium">
            Aprende a clasificar los instrumentos musicales de forma divertida y desafiante. 
            ¡Supera los 4 niveles para ganar!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <li className="list-none p-4 bg-white border-2 border-black flex gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <ImageIcon className="text-blue-500 shrink-0" />
              <div>
                <p className="font-bold">Vista y Oído</p>
                <p className="text-sm text-zinc-500">Reconoce por imagen y sonido.</p>
              </div>
            </li>
            <li className="list-none p-4 bg-white border-2 border-black flex gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Layers className="text-green-500 shrink-0" />
              <div>
                <p className="font-bold">Ciencia Musical</p>
                <p className="text-sm text-zinc-500">Familias orquestales y organológicas.</p>
              </div>
            </li>
          </div>
          <div className="space-y-4 text-left">
            <label className="block text-sm font-black uppercase tracking-widest text-zinc-500">Tu Nombre:</label>
            <input 
              type="text" 
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Ingresa tu nombre aquí..."
              className="w-full p-4 text-xl font-bold border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-yellow-50"
            />
          </div>
          <button 
            onClick={() => studentName.trim() && setGameState("PLAYING")}
            disabled={!studentName.trim()}
            className="brutal-button w-full text-xl py-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ¡Comenzar Juego!
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState === "LEVEL_TRANSITION") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-indigo-600">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-lg w-full brutal-card text-center space-y-6"
        >
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
          <h2 className="text-3xl font-black">¡NIVEL COMPLETADO!</h2>
          <p className="text-lg font-medium">Has superado el {currentLevel.title}.</p>
          <div className="py-4 px-6 bg-zinc-100 border-2 border-black">
            <p className="text-zinc-500 uppercase text-xs font-black tracking-widest mb-1">Siguiente:</p>
            <p className="text-xl font-bold text-indigo-700">{LEVELS[currentLevelIndex + 1].title}</p>
          </div>
          <button 
            onClick={startNextLevel}
            className="brutal-button w-full flex items-center justify-center gap-2"
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
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();

      // Header
      doc.setFillColor(79, 70, 229); // indigo-600
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTE DE LOGRO", 105, 25, { align: "center" });

      // Student Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(`Fecha: ${date}`, 20, 50);
      
      doc.setFontSize(18);
      doc.text("Estudiante:", 20, 65);
      doc.setFontSize(26);
      doc.text(studentName, 20, 80);

      // Results Section
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(20, 90, 190, 90);

      doc.setFontSize(16);
      doc.text("Resumen de Actividad:", 20, 105);
      
      doc.setFontSize(14);
      doc.text(`- Puntaje Total: ${score} puntos`, 30, 120);
      doc.text(`- Aciertos: ${correctAnswers} de ${totalAttempted}`, 30, 130);
      doc.text(`- Porcentaje de Logro: ${achievementPercentage}%`, 30, 140);

      // Status
      let statusText = "Requiere Refuerzo";
      if (achievementPercentage === 100) statusText = "¡Excelente - Maestro Musical!";
      else if (achievementPercentage >= 60) statusText = "Buen Trabajo - Aprobado";
      
      doc.setFontSize(18);
      doc.text("Estado:", 20, 160);
      doc.setFontSize(22);
      doc.text(statusText, 20, 175);

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Generado por Armonía en Clasificación - Juego Educativo Musical", 105, 280, { align: "center" });

      doc.save(`Reporte_Musical_${studentName.replace(/\s+/g, '_')}.pdf`);
    };

    const shareByEmail = () => {
      const subject = `Reporte de Logro Musical - ${studentName}`;
      const body = `Hola,\n\nSoy ${studentName} y he completado el juego Armonía en Clasificación.\n\n` +
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-900">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-xl w-full brutal-card text-center space-y-8"
        >
          <Trophy className="w-24 h-24 text-yellow-500 mx-auto" />
          <div>
            <h2 className="text-4xl font-black mb-1 uppercase tracking-tighter">{studentName}</h2>
            <h2 className="text-2xl font-black mb-2 text-zinc-400">¡RETO COMPLETADO!</h2>
            <p className="text-zinc-600 font-medium">Has dominado la clasificación de instrumentos.</p>
          </div>
          <div className="flex justify-center gap-12 py-8 border-y-2 border-black border-dashed">
            <div>
              <p className="text-4xl font-black text-indigo-600">{score}</p>
              <p className="text-xs font-black uppercase text-zinc-400">Puntaje</p>
            </div>
            <div>
              <p className={`text-4xl font-black ${percentageColor}`}>{achievementPercentage}%</p>
              <p className="text-xs font-black uppercase text-zinc-400">Logro</p>
            </div>
            <div>
              <p className="text-4xl font-black text-zinc-800">{correctAnswers}/{totalAttempted}</p>
              <p className="text-xs font-black uppercase text-zinc-400">Aciertos</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={downloadPDFReport}
              className="brutal-button bg-green-600 w-full flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Descargar Reporte PDF
            </button>
            <button 
              onClick={shareByEmail}
              className="brutal-button bg-blue-500 w-full flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" /> Compartir por Correo
            </button>
            <button 
              onClick={restartGame}
              className="brutal-button-secondary w-full flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-5 h-5" /> Jugar de nuevo
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = sessionQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-12 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-5xl mx-auto mb-8 bg-black text-white p-4 brutal-border flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="text-sm font-black uppercase tracking-widest text-zinc-400">Estudiante:</span>
        <h2 className="text-3xl md:text-5xl font-black truncate max-w-full">{studentName}</h2>
      </div>
      <header className="max-w-5xl mx-auto flex items-center justify-between gap-4 mb-8">
        <div className="flex-1 max-w-md">
          <div className="flex justify-between items-end mb-2">
             <h2 className="text-lg font-black uppercase tracking-tight text-indigo-700">{currentLevel.title}</h2>
             <span className="text-sm font-bold text-zinc-400">{currentQuestionIndex + 1} / {sessionQuestions.length}</span>
          </div>
          <div className="h-4 w-full bg-zinc-200 border-2 border-black overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / sessionQuestions.length) * 100}%` }}
              className="h-full bg-indigo-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <span className="font-black text-xl">{score}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white border-4 border-black p-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="aspect-video bg-zinc-100 mb-6 border-2 border-black overflow-hidden relative group">
                {(currentLevelIndex === 2 || (currentLevelIndex === 3 && currentQuestion?.sound)) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-indigo-50">
                    <button 
                      onClick={() => playInstrumentSound(currentQuestion.sound)}
                      className={`w-40 h-40 rounded-full flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${isPlayingSound ? "bg-green-500 translate-x-1 translate-y-1 shadow-none" : "bg-indigo-600 hover:bg-indigo-700"}`}
                      disabled={isPlayingSound}
                    >
                      {isPlayingSound ? (
                        <div className="flex gap-2 items-center">
                          {[1,2,3,4].map(i => (
                            <motion.div 
                              key={i}
                              animate={{ scaleY: [1, 2, 1] }}
                              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                              className="w-2 h-8 bg-white rounded-full"
                            />
                          ))}
                        </div>
                      ) : (
                        <Volume2 className="w-20 h-20 text-white" />
                      )}
                    </button>
                    <p className="mt-6 font-black uppercase text-indigo-700 tracking-wider">Presiona para escuchar</p>
                  </div>
                ) : (
                  <img 
                    src={currentQuestion?.image} 
                    alt="Instrumento" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover grayscale-0 group-hover:scale-105 transition-transform duration-500"
                  />
                )}
              </div>
              <div className="space-y-2">
                <span className="inline-block bg-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest">
                  Pregunta {currentQuestionIndex + 1}
                </span>
                <h3 className="text-3xl font-black leading-tight">
                  {currentLevelIndex === 1 || (currentLevelIndex === 3 && Math.random() > 0.5 && !options.includes(currentQuestion?.name)) 
                    ? "¿A qué familia pertenece?" 
                    : "¿Cuál es este instrumento?"}
                </h3>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {options.map((option, idx) => (
              <motion.button
                key={`${currentQuestionIndex}-${idx}`}
                whileHover={{ scale: feedback ? 1 : 1.02 }}
                whileTap={{ scale: feedback ? 1 : 0.98 }}
                onClick={() => handleAnswer(option)}
                disabled={!!feedback}
                className={`w-full text-left p-6 font-black text-xl border-4 border-black transition-all flex items-center justify-between
                  ${feedback ? (
                    (option === currentQuestion?.name || option === currentQuestion?.organologicalFamily || option === currentQuestion?.orchestralFamily)
                    ? "bg-green-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                    : (feedback && !feedback.isCorrect && option === feedback.message.split(' ').pop()) ? "bg-red-500 text-white" : "bg-white opacity-40 shadow-none border-zinc-300"
                  ) : "bg-white hover:bg-yellow-300 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"}
                `}
              >
                {option}
                {feedback && (option === currentQuestion?.name || option === currentQuestion?.organologicalFamily || option === currentQuestion?.orchestralFamily) && (
                  <CheckCircle2 className="w-8 h-8" />
                )}
              </motion.button>
            ))}
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${feedback.isCorrect ? "bg-green-50" : "bg-red-50"}`}
              >
                <div className="flex gap-6">
                  <div className={`p-4 border-2 border-black self-start ${feedback.isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                    {feedback.isCorrect ? <CheckCircle2 className="text-white w-8 h-8" /> : <XCircle className="text-white w-8 h-8" />}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-2xl font-black uppercase mb-1">{feedback.isCorrect ? "¡Excelente!" : "¡Ups!"}</p>
                      <p className="text-zinc-700 font-bold leading-snug">{feedback.message}</p>
                    </div>
                    <div className="p-4 bg-white/50 border-2 border-black border-dashed">
                      <p className="text-sm font-medium text-zinc-600 italic">Sabías que... {currentQuestion?.description}</p>
                    </div>
                    <button 
                      onClick={nextQuestion}
                      className="brutal-button w-full flex items-center justify-center gap-2 py-4 text-xl"
                    >
                      {currentQuestionIndex < sessionQuestions.length - 1 ? "Siguiente Pregunta" : "Continuar"} <ArrowRight />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
