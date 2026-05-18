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
  Music2,
  Library,
} from "lucide-react";
import confetti from "canvas-confetti";
import { INSTRUMENTS, Instrument, OrganologicalFamily, OrchestralFamily, BasicFamily, InstrumentTier } from "./data/instruments";

// --- Types ---
type GameState = "START" | "LEVEL_TRANSITION" | "PLAYING" | "SUMMARY" | "GALLERY" | "MAP";
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

// --- Constants ---
const STORAGE_KEY = "musical_classification_game_state";

export default function App() {
  // Load initial state from localStorage
  const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

  const [gameState, setGameState] = useState<GameState>(savedState.gameState || "START");
  const [studentName, setStudentName] = useState(savedState.studentName || "");
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(savedState.currentLevelIndex || 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(savedState.currentQuestionIndex || 0);
  const [score, setScore] = useState(savedState.score || 0);
  const [correctAnswers, setCorrectAnswers] = useState(savedState.correctAnswers || 0);
  const [totalAttempted, setTotalAttempted] = useState(savedState.totalAttempted || 0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<Instrument[]>(savedState.sessionQuestions || []);
  const [options, setOptions] = useState<string[]>(savedState.options || []);
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>(savedState.currentQuestionType || "NAME");
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [expandedOrchestralCat, setExpandedOrchestralCat] = useState<string | null>(null);
  const [expandedOrchestralSub, setExpandedOrchestralSub] = useState<string | null>(null);
  const [expandedOrganoCat, setExpandedOrganoCat] = useState<string | null>(null);
  const [selectedPreviewInstrument, setSelectedPreviewInstrument] = useState<Instrument | null>(null);

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

  const playClickSound = () => {
    const click = new Audio("/sounds/clic.wav");
    click.play().catch(() => {});
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
    // Save state to localStorage whenever relevant state changes
    const stateToSave = {
      gameState,
      studentName,
      currentLevelIndex,
      currentQuestionIndex,
      score,
      correctAnswers,
      totalAttempted,
      sessionQuestions,
      options,
      currentQuestionType
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [gameState, studentName, currentLevelIndex, currentQuestionIndex, score, correctAnswers, totalAttempted, sessionQuestions, options, currentQuestionType]);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => stopSound();
  }, []);

  useEffect(() => {
    if (gameState === "LEVEL_TRANSITION") {
      const stageSound = new Audio("/sounds/etapa_superada.wav");
      stageSound.volume = 0.2;
      stageSound.play().catch(err => {
        console.warn("No se pudo reproducir etapa_superada.wav", err);
      });
    } else if (gameState === "SUMMARY") {
      const fanfarre = new Audio("/sounds/fanfarre.mp3");
      fanfarre.play().catch(err => {
        console.warn("No se pudo reproducir fanfarre.mp3", err);
      });
    }
  }, [gameState]);

  useEffect(() => {
    // Only generate new questions if there aren't any for the current level
    if (gameState === "PLAYING" && (sessionQuestions.length === 0 || currentQuestionIndex === 0 && sessionQuestions.length !== currentLevel.count)) {
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
      
      // Play correct sound with diagnostic logging
      const sound = new Audio("/sounds/correct.wav");
      sound.play().catch(err => {
        console.warn("No se pudo reproducir correct.wav. Asegúrate de que el archivo no esté vacío y sea un WAV válido.", err);
      });
    } else {
      explanation = `Lo siento, el instrumento es un ${correctInstrument.name}. Es un ${correctInstrument.basicFamily.toLowerCase()}, de tipo ${correctInstrument.organologicalFamily.toLowerCase()} (${correctInstrument.orchestralFamily.toLowerCase()}).`;
      setFeedback({ isCorrect: false, message: explanation });
      
      // Play incorrect sound with diagnostic logging
      const sound = new Audio("/sounds/incorrect.wav");
      sound.play().catch(err => {
        console.warn("No se pudo reproducir incorrect.wav. Asegúrate de que el archivo no esté vacío y sea un WAV válido.", err);
      });
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
    setSessionQuestions([]);
    setCurrentQuestionIndex(0);
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
    setSessionQuestions([]);
    setOptions([]);
    setGameState("START");
    localStorage.removeItem(STORAGE_KEY);
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
            Test Interactivo: Clasificación de Instrumentos Musicales
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <button 
              onClick={() => {
                playClickSound();
                setGameState("GALLERY");
              }}
              className="p-2 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-28 hover:bg-indigo-50 transition-colors group relative"
            >
              <img src="/vista_y_oido.png" alt="Vista y Oído" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white font-black text-xl tracking-tighter uppercase">Ver Galería</span>
              </div>
            </button>
            <button 
              onClick={() => {
                playClickSound();
                setGameState("MAP");
              }}
              className="p-2 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-28 hover:bg-yellow-50 transition-colors group relative"
            >
              <img src="/ciencia_musical.png" alt="Ciencia Musical" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white font-black text-xl tracking-tighter uppercase">Explorar Ciencia</span>
              </div>
            </button>
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
    
    // Calcular nota con escala del 60%
    const calculateGrade = (pts: number, maxPts: number) => {
      if (maxPts === 0) return "1.0";
      const exigencia = 0.6;
      const corte = maxPts * exigencia;
      let nota: number;
      if (pts < corte) {
        nota = (3 * (pts / corte)) + 1;
      } else {
        nota = (3 * ((pts - corte) / (maxPts - corte))) + 4;
      }
      return nota.toFixed(1);
    };

    const finalGrade = calculateGrade(correctAnswers, totalAttempted);
    
    let percentageColor = "text-red-600";
    let gradeColor = "text-red-600";
    if (achievementPercentage === 100) {
      percentageColor = "text-green-600";
      gradeColor = "text-green-600";
    } else if (achievementPercentage >= 60) {
      percentageColor = "text-green-600";
      gradeColor = "text-green-700";
    }

    const downloadPDFReport = () => {
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      doc.setFillColor(79, 70, 229); 
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTE DE LOGRO", 105, 25, { align: "center" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Fecha: ${date}`, 20, 50);
      doc.setFontSize(16);
      doc.text("Estudiante:", 20, 60);
      doc.setFontSize(22);
      doc.text(studentName, 20, 75);
      
      // Calificación Central
      doc.setFillColor(245, 245, 245);
      doc.rect(20, 90, 170, 60, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.rect(20, 90, 170, 60, 'S');
      
      doc.setFontSize(14);
      doc.text("CALIFICACIÓN FINAL", 105, 105, { align: "center" });
      doc.setFontSize(60);
      doc.setTextColor(Number(finalGrade) >= 4 ? 0 : 200, 0, 0);
      doc.text(finalGrade, 105, 135, { align: "center" });
      
      // Detalles
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Exigencia: 60%`, 105, 145, { align: "center" });

      doc.setLineWidth(0.5);
      doc.line(20, 160, 190, 160);
      
      doc.setFontSize(14);
      doc.text("Resumen de Actividad:", 20, 175);
      doc.setFontSize(12);
      doc.text(`- Puntaje Total: ${score} puntos`, 30, 185);
      doc.text(`- Aciertos: ${correctAnswers} de ${totalAttempted}`, 30, 195);
      doc.text(`- Porcentaje de Logro: ${achievementPercentage}%`, 30, 205);

      let statusText = "Reprobado - Requiere Refuerzo";
      if (achievementPercentage === 100) statusText = "¡Excelente - Maestro Musical!";
      else if (achievementPercentage >= 60) statusText = "Aprobado - Buen Trabajo";
      
      doc.setFontSize(16);
      doc.text("Estado:", 20, 225);
      doc.setFontSize(18);
      doc.setTextColor(Number(finalGrade) >= 4 ? 0 : 200, 0, 0);
      doc.text(statusText, 20, 235);

      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Generado por LOS INSTRUMENTOS MUSICALES - Juego Educativo Musical", 105, 280, { align: "center" });
      doc.save(`Reporte_Musical_${studentName.replace(/\s+/g, '_')}.pdf`);
    };

    const shareByEmail = () => {
      const subject = `Reporte de Logro Musical - ${studentName}`;
      const body = `Hola,\n\nSoy ${studentName} y he completado el juego LOS INSTRUMENTOS MUSICALES.\n\n` +
        `Mis resultados:\n` +
        `- Calificación: ${finalGrade}\n` +
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
          <div className="space-y-1">
            <h2 className="text-3xl font-black uppercase tracking-tighter">{studentName}</h2>
            <p className="text-sm text-zinc-600 font-medium">Test de Instrumentos Musicales</p>
          </div>

          <div className="py-6 bg-indigo-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Calificación Final</p>
            <p className={`text-7xl font-black ${gradeColor} tracking-tighter`}>{finalGrade}</p>
            <p className="text-[10px] font-bold text-zinc-400 mt-2">EXIGENCIA 60%</p>
          </div>

          <div className="flex justify-center gap-8 py-2">
            <div>
              <p className="text-xl font-black text-indigo-600">{score}</p>
              <p className="text-[10px] font-black uppercase text-zinc-400">Puntaje</p>
            </div>
            <div>
              <p className={`text-xl font-black ${percentageColor}`}>{achievementPercentage}%</p>
              <p className="text-[10px] font-black uppercase text-zinc-400">Logro</p>
            </div>
            <div>
              <p className="text-xl font-black text-zinc-800">{correctAnswers}/{totalAttempted}</p>
              <p className="text-[10px] font-black uppercase text-zinc-400">Aciertos</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 pt-2">
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

  if (gameState === "MAP") {
    return (
      <div className="min-h-screen bg-yellow-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">Ciencia Musical</h1>
              <p className="text-xl text-zinc-600 font-medium">Clasificación instrumental interactiva</p>
            </div>
            <button 
              onClick={() => {
                playClickSound();
                setGameState("START");
              }}
              className="brutal-button bg-white text-black flex items-center gap-2"
            >
              <RefreshCcw className="w-5 h-5" /> Volver al Inicio
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* FAMILIAS ORQUESTALES */}
            <div className="brutal-card bg-white p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-4 bg-indigo-600 text-white p-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6 border-b-4 border-black">
                <Music2 className="w-8 h-8" />
                <h2 className="text-3xl font-black uppercase tracking-tight">Familias Orquestales</h2>
              </div>
              
              <div className="space-y-4">
                {[
                  { 
                    name: "Cuerdas", 
                    icon: "🎻", 
                    color: "bg-red-200", 
                    desc: "Instrumentos que producen sonido por la vibración de una o más cuerdas.",
                    subs: [
                      { name: "Frotadas", orchestral: OrchestralFamily.STRINGS_BOWED, desc: "Se tocan frotando un arco." },
                      { name: "Pulsadas", orchestral: OrchestralFamily.STRINGS_PLUCKED, desc: "Se tocan pulsando las cuerdas con los dedos o púa." },
                      { name: "Percutidas", orchestral: OrchestralFamily.STRINGS_STRUCK, desc: "Se tocan golpeando las cuerdas con martillos." }
                    ]
                  },
                  { 
                    name: "Vientos", 
                    icon: "🎺", 
                    color: "bg-blue-200", 
                    desc: "Instrumentos en los que el sonido es producido por la vibración de aire.",
                    subs: [
                      { name: "Madera", orchestral: OrchestralFamily.WOODWINDS, desc: "Originalmente de madera, usan lengüeta o bisel." },
                      { name: "Metal", orchestral: OrchestralFamily.BRASS, desc: "De metal, el sonido nace de la vibración de los labios." }
                    ]
                  },
                  { 
                    name: "Percusión", 
                    icon: "🥁", 
                    color: "bg-green-200", 
                    desc: "Instrumentos que se golpean, sacuden o raspan.",
                    subs: [
                      { name: "Altura Definida", orchestral: OrchestralFamily.PERCUSSION_PITCHED, desc: "Pueden producir notas musicales afinadas." },
                      { name: "Altura Indefinida", orchestral: OrchestralFamily.PERCUSSION_UNPITCHED, desc: "Producen sonidos de ritmo sin nota específica." }
                    ]
                  }
                ].map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <button 
                      onClick={() => {
                        playClickSound();
                        setExpandedOrchestralCat(expandedOrchestralCat === cat.name ? null : cat.name);
                        setExpandedOrchestralSub(null);
                      }}
                      className={`w-full text-left p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${cat.color} hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <h3 className="text-xl font-black uppercase">{cat.name}</h3>
                      </div>
                      <span className="font-black text-2xl">{expandedOrchestralCat === cat.name ? "−" : "+"}</span>
                    </button>

                    <AnimatePresence>
                      {expandedOrchestralCat === cat.name && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2 ml-4"
                        >
                          <div className="p-4 bg-white border-2 border-black border-dashed text-sm font-bold">
                            {cat.desc}
                          </div>
                          
                          {cat.subs.map(sub => (
                            <div key={sub.name} className="space-y-2">
                              <button
                                onClick={() => {
                                  playClickSound();
                                  setExpandedOrchestralSub(expandedOrchestralSub === sub.name ? null : sub.name);
                                }}
                                className={`w-full text-left p-3 border-2 border-black flex items-center justify-between ${expandedOrchestralSub === sub.name ? "bg-zinc-800 text-white" : "bg-white hover:bg-zinc-100"}`}
                              >
                                <span className="font-black uppercase text-sm tracking-tight">{sub.name}</span>
                                <span className="text-xs">{expandedOrchestralSub === sub.name ? "Cerrar" : "Ver ejemplos"}</span>
                              </button>

                              <AnimatePresence>
                                {expandedOrchestralSub === sub.name && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-2"
                                  >
                                    <p className="text-xs font-medium text-zinc-600 bg-zinc-50 p-2 border-x-2 border-zinc-200">{sub.desc}</p>
                                    <div className="flex gap-2 p-2 bg-zinc-100 border-2 border-black overflow-x-auto">
                                      {INSTRUMENTS.filter(i => i.orchestralFamily === sub.orchestral).map(instr => (
                                        <button 
                                          key={instr.id} 
                                          onClick={() => {
                                            playClickSound();
                                            setSelectedPreviewInstrument(instr);
                                          }}
                                          className="w-16 h-16 bg-white border border-black p-1 flex-shrink-0 hover:scale-110 transition-transform"
                                        >
                                          <img src={instr.image} alt={instr.name} title={instr.name} className="w-full h-full object-contain" />
                                        </button>
                                      ))}
                                      {INSTRUMENTS.filter(i => i.orchestralFamily === sub.orchestral).length === 0 && (
                                        <span className="text-[10px] font-bold text-zinc-500 italic uppercase">Explora la galería para ver ejemplos</span>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* ORGANOLOGÍA */}
            <div className="brutal-card bg-white p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-4 bg-yellow-400 text-black p-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6 border-b-4 border-black">
                <Library className="w-8 h-8" />
                <h2 className="text-3xl font-black uppercase tracking-tight">Organología</h2>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: "Cordófonos", icon: "🎻", desc: "El sonido se produce por la vibración de cuerdas tensas.", organo: OrganologicalFamily.CHORDOPHONE, color: "bg-orange-100" },
                  { name: "Aerófonos", icon: "🎺", desc: "El sonido se produce por la vibración de una columna de aire.", organo: OrganologicalFamily.AEROPHONE, color: "bg-blue-100" },
                  { name: "Membranófonos", icon: "🥁", desc: "El sonido se produce por la vibración de una membrana tensa.", organo: OrganologicalFamily.MEMBRANOPHONE, color: "bg-red-100" },
                  { name: "Idiófonos", icon: "🔔", desc: "El cuerpo del propio instrumento es el que vibra.", organo: OrganologicalFamily.IDIOPHONE, color: "bg-yellow-100" },
                  { name: "Electrófonos", icon: "🎹", desc: "El sonido se produce o amplifica mediante medios eléctricos.", organo: OrganologicalFamily.ELECTROPHONE, color: "bg-purple-100" }
                ].map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <button 
                      onClick={() => {
                        playClickSound();
                        setExpandedOrganoCat(expandedOrganoCat === cat.name ? null : cat.name);
                      }}
                      className={`w-full text-left p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${cat.color} hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <h3 className="text-xl font-black uppercase">{cat.name}</h3>
                      </div>
                      <span className="font-black text-2xl">{expandedOrganoCat === cat.name ? "−" : "+"}</span>
                    </button>

                    <AnimatePresence>
                      {expandedOrganoCat === cat.name && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2 ml-4"
                        >
                          <div className="p-4 bg-white border-2 border-black border-dashed text-sm font-bold">
                            {cat.desc}
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-zinc-400 ml-1">Ejemplos:</p>
                            <div className="flex gap-2 p-3 bg-zinc-100 border-2 border-black overflow-x-auto">
                              {INSTRUMENTS.filter(i => i.organologicalFamily === cat.organo).slice(0, 10).map(instr => (
                                <button 
                                  key={instr.id} 
                                  onClick={() => {
                                    playClickSound();
                                    setSelectedPreviewInstrument(instr);
                                  }}
                                  className="w-14 h-14 bg-white border border-black p-1 flex-shrink-0 grayscale hover:grayscale-0 hover:scale-110 transition-all"
                                >
                                  <img src={instr.image} alt={instr.name} title={instr.name} className="w-full h-full object-contain" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        <AnimatePresence>
          {selectedPreviewInstrument && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setSelectedPreviewInstrument(null)}
            >
              <motion.div 
                initial={{ scale: 0.8, rotate: -2 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.8, rotate: 2 }}
                className="max-w-xl w-full brutal-card bg-white p-8 space-y-6 relative"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setSelectedPreviewInstrument(null)}
                  className="absolute top-4 right-4 bg-red-500 text-white p-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-1 translate-y-1"
                >
                  <XCircle className="w-6 h-6" />
                </button>

                <div className="aspect-square w-full border-4 border-black bg-zinc-50 overflow-hidden flex items-center justify-center">
                  <img 
                    src={selectedPreviewInstrument.image} 
                    alt={selectedPreviewInstrument.name} 
                    className="w-full h-full object-contain p-8"
                  />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-4xl font-black uppercase tracking-tighter">{selectedPreviewInstrument.name}</h3>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Zoom de Instrumento</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (gameState === "GALLERY") {
    return (
      <div className="min-h-screen bg-indigo-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">Galería de Instrumentos</h1>
              <p className="text-xl text-zinc-600 font-medium">
                Haz clic en un instrumento para escuchar su sonido y conocer su clasificación.
              </p>
            </div>
            <button 
              onClick={() => {
                playClickSound();
                stopSound();
                setGameState("START");
              }}
              className="brutal-button bg-white text-black flex items-center gap-2"
            >
              <RefreshCcw className="w-5 h-5" /> Volver al Inicio
            </button>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {INSTRUMENTS.map((instrument) => {
              const isSelected = selectedGalleryId === instrument.id;
              return (
                <div key={instrument.id} className="flex flex-col h-full">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      playClickSound();
                      if (isSelected) {
                        stopSound();
                        setSelectedGalleryId(null);
                      } else {
                        setSelectedGalleryId(instrument.id);
                        playInstrumentSound(instrument.sound);
                      }
                    }}
                    className={`p-3 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-2 transition-all h-full
                      ${isSelected ? "bg-yellow-200 border-dashed translate-x-1 translate-y-1 shadow-none" : "hover:bg-indigo-100"}
                    `}
                  >
                    <div className="aspect-square w-full border-2 border-black overflow-hidden bg-zinc-50 pointer-events-none relative">
                      <img 
                        src={instrument.image} 
                        alt={instrument.name} 
                        className="w-full h-full object-contain"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-white border border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <Volume2 className="w-3 h-3 text-indigo-600 animate-pulse" />
                        </div>
                      )}
                    </div>
                    <span className="font-black text-xs md:text-sm uppercase tracking-tighter text-center line-clamp-2">
                      {instrument.name}
                    </span>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden w-full"
                        >
                          <div className="mt-2 p-3 bg-black text-white border-2 border-black text-[10px] md:text-xs space-y-2 text-left">
                            <p className="font-bold leading-tight">{instrument.description}</p>
                            <div className="space-y-1 border-t border-zinc-700 pt-2 opacity-80">
                              <p><span className="text-yellow-400 font-black">FAMILIA:</span> {instrument.basicFamily}</p>
                              <p><span className="text-yellow-400 font-black">TIPO:</span> {instrument.organologicalFamily}</p>
                              <p><span className="text-yellow-400 font-black">ORQUESTA:</span> {instrument.orchestralFamily}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
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
                    {!feedback.isCorrect && (
                      <p className="text-xl font-bold text-zinc-900 border-b-2 border-black/10 pb-4 inline-block">
                        {feedback.message}
                      </p>
                    )}
                  </div>
                  {feedback.isCorrect && (
                    <div className="p-4 bg-zinc-900 text-zinc-200 border-2 border-black rotate-1">
                      <p className="text-lg font-medium leading-relaxed">
                        <span className="text-yellow-400 font-black">TIP MUSICAL:</span> {currentQuestion?.description}
                      </p>
                    </div>
                  )}
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
