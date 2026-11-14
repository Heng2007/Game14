export const OPENING_LINE = { id: 'opening', zone: 'ACT_I_EDEN', text: 'A world begins wherever the eye agrees to enter.' };
const TRIGGER_PATH = [[-84,18],[-60,9],[-38,-5],[-24,-9],[-3.5,0],[27,-1],[43,-1],[81,-25],[92,2]];
export const SCRIPT = [
  { id: 'eden-1', x: -86, z: 26, radius: 3.5, zone: 'ACT_I_EDEN', text: 'Before we named the garden, nothing here belonged to us.' },
  { id: 'eden-2', x: -66, z: 26, radius: 3.5, zone: 'ACT_I_EDEN', text: 'Innocence is not goodness. It is the absence of a mirror.' },
  { id: 'eden-3', x: -44, z: 26, radius: 3.5, zone: 'ACT_I_EDEN', text: 'Even the first light casts something out of sight.' },
  { id: 'garden-1', x: -26, z: 26, radius: 3.5, zone: 'ACT_II_GARDEN', text: 'Desire calls the world abundant, and the self unfinished.' },
  { id: 'garden-2', x: -3, z: 26, radius: 3.5, zone: 'ACT_II_GARDEN', text: 'We circle what we love, mistaking movement for arrival.' },
  { id: 'garden-3', x: 23, z: 26, radius: 3.5, zone: 'ACT_II_GARDEN', text: 'The sweetest fruit remembers neither the hand nor the hunger.' },
  { id: 'hell-1', x: 43, z: 26, radius: 3.5, zone: 'ACT_III_HELL', text: 'What falls here is not punishment. It is the weight we kept.' },
  { id: 'hell-2', x: 65, z: 26, radius: 3.5, zone: 'ACT_III_HELL', text: 'A broken song still knows the shape of its silence.' },
  { id: 'hell-3', x: 89, z: 26, radius: 3.5, zone: 'ACT_III_HELL', text: 'At the end, the mirror returns only what we brought.' },
].map((line,i)=>({...line,x:TRIGGER_PATH[i][0],z:TRIGGER_PATH[i][1]}));

export class NarrativeTriggers {
  constructor(lines = SCRIPT) { this.lines = lines.map(line => ({ ...line, triggered: false })); this.fired = new Set(); this.history = []; }
  reset() { this.fired.clear(); this.history.length = 0; this.lines.forEach(line => { line.triggered = false; }); }
  update(position, onTrigger) {
    for (const line of this.lines) {
      if (line.triggered || this.fired.has(line.id) || Math.hypot(position.x - line.x, position.z - line.z) > line.radius) continue;
      line.triggered = true;
      this.fired.add(line.id);
      this.history.push({ id: line.id, x: position.x, zone: line.zone });
      onTrigger(line);
    }
  }
}
