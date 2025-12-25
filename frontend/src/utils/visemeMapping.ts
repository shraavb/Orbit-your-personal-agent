/**
 * Viseme mapping utility for lip-sync animation.
 * Maps characters to mouth shapes (visemes) for realistic speech animation.
 */

export type VisemeType =
  | 'neutral' | 'a' | 'e' | 'i' | 'o' | 'u' | 'm' | 'f' | 'l' | 'th' | 'w' | 'sh' | 'r';

/**
 * Map a character to its corresponding viseme (mouth shape).
 * This is a simplified mapping - character position is not always accurate for phonemes.
 */
export function mapCharacterToViseme(char: string, nextChar?: string): VisemeType {
  const lower = char.toLowerCase();
  const next = nextChar?.toLowerCase();

  // Vowels - more generous mapping
  if (lower === 'a') return 'a';
  if (lower === 'e') return 'e';
  if (lower === 'i' || lower === 'y') return 'i';
  if (lower === 'o') return 'o';
  if (lower === 'u') return 'u';

  // W sound - lips pursed forward
  if (lower === 'w') return 'w';

  // R sound - lips rounded/gathered
  if (lower === 'r') return 'r';

  // TH sound - tongue between teeth (check for digraph)
  if (lower === 't' && next === 'h') return 'th';
  if (lower === 'h' && nextChar === undefined) return 'th'; // If we see 'h' after 't' was processed

  // SH/CH sounds - lips forward, teeth close
  if (lower === 's' && next === 'h') return 'sh';
  if (lower === 'c' && next === 'h') return 'sh';

  // Bilabial consonants (lips together) - visible
  if (lower === 'm' || lower === 'b' || lower === 'p') return 'm';

  // Labiodental consonants (teeth on lip) - visible
  if (lower === 'f' || lower === 'v') return 'f';

  // Alveolar/dental consonants - tongue visible
  if (lower === 'l' || lower === 't' || lower === 'd' ||
      lower === 'n' || lower === 's' || lower === 'z') return 'l';

  // Everything else - neutral or slightly open
  if (lower === ' ' || lower === ',' || lower === '.') return 'neutral';

  // Default for other consonants - slight opening
  return 'e';
}

/**
 * Smooth viseme timeline by removing rapid changes and holding visemes longer
 */
export function smoothVisemeTimeline(timeline: VisemeEvent[], minDuration: number = 0.08): VisemeEvent[] {
  if (timeline.length === 0) return [];

  const smoothed: VisemeEvent[] = [];
  let currentViseme = timeline[0].viseme;
  let currentStart = timeline[0].startTime;
  let currentChar = timeline[0].character;

  for (let i = 1; i < timeline.length; i++) {
    const event = timeline[i];
    const duration = event.endTime - currentStart;

    // If viseme changes OR we've held long enough, create a segment
    if (event.viseme !== currentViseme || duration >= 0.3) {
      if (duration >= minDuration) {
        smoothed.push({
          viseme: currentViseme,
          startTime: currentStart,
          endTime: event.startTime,
          character: currentChar,
        });
      }
      currentViseme = event.viseme;
      currentStart = event.startTime;
      currentChar = event.character;
    }
  }

  // Add final segment
  const lastEvent = timeline[timeline.length - 1];
  smoothed.push({
    viseme: currentViseme,
    startTime: currentStart,
    endTime: lastEvent.endTime,
    character: currentChar,
  });

  return smoothed;
}

export interface VisemeEvent {
  viseme: VisemeType;
  startTime: number;
  endTime: number;
  character: string;
}

/**
 * Create a timeline of viseme events from character alignment data.
 */
export function createVisemeTimeline(
  characters: string[],
  startTimes: number[],
  endTimes: number[]
): VisemeEvent[] {
  return characters.map((char, index) => ({
    viseme: mapCharacterToViseme(char, characters[index + 1]),
    startTime: startTimes[index],
    endTime: endTimes[index],
    character: char,
  }));
}

/**
 * Get the current viseme for a given timestamp in the timeline.
 */
export function getCurrentViseme(
  visemeTimeline: VisemeEvent[],
  currentTime: number
): VisemeType {
  const currentEvent = visemeTimeline.find(
    event => currentTime >= event.startTime && currentTime <= event.endTime
  );
  return currentEvent ? currentEvent.viseme : 'neutral';
}
