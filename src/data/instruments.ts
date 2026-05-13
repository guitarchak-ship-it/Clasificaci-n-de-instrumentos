export enum OrganologicalFamily {
  AEROPHONE = "Aerófono",
  CHORDOPHONE = "Cordófono",
  MEMBRANOPHONE = "Membranófono",
  IDIOPHONE = "Idiófono",
  ELECTROPHONE = "Electrófono",
}

export enum OrchestralFamily {
  STRINGS = "Cuerdas",
  WOODWINDS = "Vientos Madera",
  BRASS = "Vientos Metal",
  PERCUSSION = "Percusión",
  OTHER = "Otros",
}

export interface Instrument {
  id: string;
  name: string;
  organologicalFamily: OrganologicalFamily;
  orchestralFamily: OrchestralFamily;
  image: string;
  sound?: string;
  description: string;
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: "violin",
    name: "Violín",
    organologicalFamily: OrganologicalFamily.CHORDOPHONE,
    orchestralFamily: OrchestralFamily.STRINGS,
    image: "/instruments/violin.jpg",
    sound: "/sounds/violin.mp3",
    description: "Instrumento de cuerda frotada por un arco. Es el más pequeño y agudo de su familia.",
  },
  {
    id: "piano",
    name: "Piano",
    organologicalFamily: OrganologicalFamily.CHORDOPHONE,
    orchestralFamily: OrchestralFamily.STRINGS,
    image: "/instruments/piano.jpg",
    sound: "/sounds/piano.mp3",
    description: "Instrumento de teclado y cuerdas percutidas. Las teclas accionan martillos que golpean las cuerdas.",
  },
  {
    id: "trumpet",
    name: "Trompeta",
    organologicalFamily: OrganologicalFamily.AEROPHONE,
    orchestralFamily: OrchestralFamily.BRASS,
    image: "/instruments/trumpet.jpg",
    sound: "/sounds/trumpet.mp3",
    description: "Instrumento de viento-metal. El sonido se produce por la vibración de los labios en la boquilla.",
  },
  {
    id: "flute",
    name: "Flauta Traversa",
    organologicalFamily: OrganologicalFamily.AEROPHONE,
    orchestralFamily: OrchestralFamily.WOODWINDS,
    image: "/instruments/flute.jpg",
    sound: "/sounds/flute.mp3",
    description: "Instrumento de viento-madera (aunque sea de metal). El aire se corta contra el borde del orificio de embocadura.",
  },
  {
    id: "timpani",
    name: "Timbales",
    organologicalFamily: OrganologicalFamily.MEMBRANOPHONE,
    orchestralFamily: OrchestralFamily.PERCUSSION,
    image: "/instruments/timpani.jpg",
    sound: "/sounds/timpani.mp3",
    description: "Instrumento de percusión con una membrana estirada sobre un caldero de cobre.",
  },
  {
    id: "triangle",
    name: "Triángulo",
    organologicalFamily: OrganologicalFamily.IDIOPHONE,
    orchestralFamily: OrchestralFamily.PERCUSSION,
    image: "/instruments/triangle.jpg",
    sound: "/sounds/triangle.mp3",
    description: "Idiófono de metal. Todo el cuerpo del instrumento vibra para producir el sonido.",
  },
  {
    id: "synthesizer",
    name: "Sintetizador",
    organologicalFamily: OrganologicalFamily.ELECTROPHONE,
    orchestralFamily: OrchestralFamily.OTHER,
    image: "/instruments/synthesizer.jpg",
    sound: "/sounds/synthesizer.mp3",
    description: "Electrófono que genera señales eléctricas que luego se convierten en sonidos audibles.",
  },
  {
    id: "cello",
    name: "Violonchelo",
    organologicalFamily: OrganologicalFamily.CHORDOPHONE,
    orchestralFamily: OrchestralFamily.STRINGS,
    image: "/instruments/cello.jpg",
    sound: "/sounds/cello.mp3",
    description: "Más grande que la viola, se toca sentado apoyándolo en el suelo con una pica.",
  },
  {
    id: "oboe",
    name: "Oboe",
    organologicalFamily: OrganologicalFamily.AEROPHONE,
    orchestralFamily: OrchestralFamily.WOODWINDS,
    image: "/instruments/oboe.jpg",
    sound: "/sounds/oboe.mp3",
    description: "Instrumento de viento con lengüeta doble, conocido por su sonido nasal y penetrante.",
  },
  {
    id: "snare",
    name: "Caja (Redoblante)",
    organologicalFamily: OrganologicalFamily.MEMBRANOPHONE,
    orchestralFamily: OrchestralFamily.PERCUSSION,
    image: "/instruments/snare.jpg",
    sound: "/sounds/snare.mp3",
    description: "Membranófono con bordonera metálica en el parche inferior que le da un sonido brillante.",
  }
];
