import { selectField, setAriaHidden } from './utils';

export function createYardLines(wrapper: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (let i = 0; i <= 10; i++) {
    const line = document.createElement('div');
    line.className = 'yard-line';
    (line as HTMLElement).style.left = `${i * 10}%`;
    setAriaHidden(line as HTMLElement);
    (frag as any).appendChild(line);
  }
  wrapper.appendChild(frag);
}

export function createLabels(wrapper: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (let pct = 10; pct <= 90; pct += 10) {
    const labelValue = pct <= 50 ? pct : 100 - pct;
    const topLabel = document.createElement('div');
    topLabel.className = 'yard-label-top';
    topLabel.textContent = String(labelValue);
    (topLabel as HTMLElement).style.left = `${pct}%`;
    setAriaHidden(topLabel as HTMLElement);
    (frag as any).appendChild(topLabel);

    const bottomLabel = document.createElement('div');
    bottomLabel.className = 'yard-label-bottom';
    bottomLabel.textContent = String(labelValue);
    (bottomLabel as HTMLElement).style.left = `${pct}%`;
    setAriaHidden(bottomLabel as HTMLElement);
    (frag as any).appendChild(bottomLabel);
  }
  wrapper.appendChild(frag);
}

export function createHashes(wrapper: HTMLElement): void {
  const frag = document.createDocumentFragment();
  for (let i = 0; i <= 100; i++) {
    const left = `${i}%`;
    const markBottom = document.createElement('div');
    markBottom.className = 'hash-mark';
    if (i % 5 === 0) markBottom.classList.add('five');
    (markBottom as HTMLElement).style.left = left;
    setAriaHidden(markBottom as HTMLElement);
    (frag as any).appendChild(markBottom);

    const markTop = document.createElement('div');
    markTop.className = 'hash-mark top';
    if (i % 5 === 0) markTop.classList.add('five');
    (markTop as HTMLElement).style.left = left;
    setAriaHidden(markTop as HTMLElement);
    (frag as any).appendChild(markTop);
  }
  wrapper.appendChild(frag);
}

export function createEndZones(wrapper: HTMLElement): void {
	if (typeof document !== 'undefined' && !document.querySelector('.end-zone.home')) {
		const homeZone = document.createElement('div');
		homeZone.className = 'end-zone home';
		const homeSpan = document.createElement('span');
		homeSpan.className = 'end-zone-text';
		homeSpan.textContent = 'HOME';
		homeZone.appendChild(homeSpan);
		wrapper.appendChild(homeZone);
	}
	if (typeof document !== 'undefined' && !document.querySelector('.end-zone.visitor')) {
		const visitorZone = document.createElement('div');
		visitorZone.className = 'end-zone visitor';
		const visitorSpan = document.createElement('span');
		visitorSpan.className = 'end-zone-text';
		visitorSpan.textContent = 'VISITORS';
		visitorZone.appendChild(visitorSpan);
		wrapper.appendChild(visitorZone);
	}
}

export function createMidLogo(wrapper: HTMLElement): void {
	if (typeof document !== 'undefined' && !document.querySelector('.mid-logo')) {
		const midLogo = document.createElement('div');
		midLogo.className = 'mid-logo';
		setAriaHidden(midLogo as HTMLElement);
		wrapper.appendChild(midLogo);
	}
}

export function buildFieldChrome(container?: HTMLElement): void {
  const field = selectField(container);
  if (!field) return;
  let chrome = field.querySelector('.field-chrome') as HTMLElement | null;
  if (chrome) return;
  chrome = document.createElement('div');
  chrome.className = 'field-chrome';
  (chrome as any).dataset.built = '1';

  createYardLines(chrome);
  createLabels(chrome);
  createHashes(chrome);
  createEndZones(chrome);
  createMidLogo(chrome);

  field.appendChild(chrome);
}

export function destroyFieldChrome(container?: HTMLElement): void {
  const field = selectField(container);
  if (!field) return;
  const chrome = field.querySelector('.field-chrome');
  if (chrome) (chrome as HTMLElement).remove();
}

export function ensureFieldChrome(container?: HTMLElement): void {
  const field = selectField(container);
  console.log('ensureFieldChrome called, field element:', field);

  if (!field) {
    console.error('Field element not found!');
    return;
  }

  if (!field.querySelector('.field-chrome')) {
    console.log('Building field chrome...');
    buildFieldChrome(field as HTMLElement);
  } else {
    console.log('Field chrome already exists');
  }
}


