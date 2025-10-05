export const createSeededRandom = (seed: number) => {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const newArray = [...array];
  const random = createSeededRandom(seed);
  let currentIndex = newArray.length;
  let randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
}
