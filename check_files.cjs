
import fs from 'fs';
import path from 'path';

// This is a temporary script to check for missing/duplicate instruments
// Since I can't import the TS file directly easily, I will just do a manual check or read it.

const instrumentsInFolder = fs.readdirSync('./public/instruments').filter(f => f !== '.gitkeep');
console.log('Total images:', instrumentsInFolder.length);

const soundsInFolder = fs.readdirSync('./public/sounds').filter(f => f !== '.gitkeep');
console.log('Total sounds:', soundsInFolder.length);

// Let's identify files that don't have a clear counterpart
const imagesWithoutSounds = instrumentsInFolder.filter(img => {
  const base = path.parse(img).name;
  return !soundsInFolder.some(snd => path.parse(snd).name === base || (base === 'oboe' && snd === 'oboe-1.mp3'));
});

const soundsWithoutImages = soundsInFolder.filter(snd => {
  const base = path.parse(snd).name;
  return !instrumentsInFolder.some(img => path.parse(img).name === base || (base === 'oboe-1' && img === 'oboe.jpg'));
});

console.log('Images without sounds (strict match):', imagesWithoutSounds);
console.log('Sounds without images (strict match):', soundsWithoutImages);
