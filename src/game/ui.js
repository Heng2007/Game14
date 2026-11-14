// PART 2 owns this file. Menus and counters, built inside the #ui element.

import './style.css';

const el = (tag, cls, html = '') => {
  const e = document.createElement(tag);
  e.className = cls; e.innerHTML = html;
  // A focused button would be clicked again by Space (our jump key), so drop focus after a click.
  if (tag === 'button') e.addEventListener('click', () => e.blur());
  return e;
};

export function createUI(root, { onPlay, onFinish, onMute }) {
  const hud = el('div', 'g-panel g-hud', '');
  const hint = el('div', 'g-panel g-hint',
    'W pedal · A/D steer · S brake · F get on/off · Space jump (tap ×3 to fly) · Enter finish · M mute');
  const buttons = el('div', 'g-panel g-top-right');
  const finish = el('button', 'g-btn', 'Finish'); finish.onclick = onFinish;
  const mute = el('button', 'g-btn', 'Mute'); mute.onclick = onMute;
  buttons.append(mute, finish);

  const menu = el('div', 'g-overlay',
    '<h1>Garden of Earthly Delights</h1><p>Ride through the garden, collect the giant fruit, and carry it to the fountain in the lake.</p>');
  const play = el('button', 'g-btn', 'Play'); play.onclick = onPlay;
  menu.append(play);

  const end = el('div', 'g-overlay g-hidden');
  const endText = el('h1', '');
  const again = el('button', 'g-btn', 'Play again'); again.onclick = onPlay;
  end.append(endText, again);

  root.append(hud, hint, buttons, menu, end);

  const show = (menuOn, hudOn, endOn) => {
    menu.classList.toggle('g-hidden', !menuOn);
    end.classList.toggle('g-hidden', !endOn);
    for (const e of [hud, hint, buttons]) e.classList.toggle('g-hidden', !hudOn);
  };
  show(true, false, false);

  return {
    showMenu: () => show(true, false, false),
    showHud: () => show(false, true, false),
    showEnd: (score) => { endText.textContent = `You delivered ${score} fruit`; show(false, false, true); },
    hideAll: () => show(false, false, false),
    setCounts: (carried, delivered, flyText) => {
      hud.innerHTML = `Carried: ${carried}<br>Delivered: ${delivered}${flyText ? `<br>${flyText}` : ''}`;
    },
    setMuted: (m) => { mute.textContent = m ? 'Unmute' : 'Mute'; },
  };
}
