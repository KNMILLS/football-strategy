import type { VisualPlaybookCard, VisualDefensiveCard, CardTheme } from './types';
import type { PlaybookName, CardType, DefensivePlay } from '../../types/dice';

/**
 * Card definitions with visual properties for programmatic rendering
 * Maps existing card data to enhanced visual cards with risk levels and perimeter bias
 */

// Helper function to determine visual properties based on card characteristics
function getVisualProperties(cardName: string, cardType: CardType, playbook?: PlaybookName): {
  riskLevel: 1 | 2 | 3 | 4 | 5;
  perimeterBias: number;
  theme: CardTheme;
} {
  const name = cardName.toLowerCase();

  // Determine theme based on playbook or card type
  let theme: CardTheme = 'offense';
  if (playbook) {
    if (playbook === 'West Coast' || playbook === 'Spread' || playbook === 'Air Raid') {
      theme = 'offense';
    } else if (playbook === 'Smashmouth' || playbook === 'Wide Zone') {
      theme = 'special';
    }
  }

  // Risk level logic based on card characteristics
  let riskLevel: 1 | 2 | 3 | 4 | 5 = 3; // Default medium risk

  // High risk cards (deep shots, trick plays, etc.)
  if (name.includes('bomb') || name.includes('long') || name.includes('razzle') ||
      name.includes('reverse') || name.includes('trick') || name.includes('flea')) {
    riskLevel = 5;
  }
  // Medium-high risk cards (intermediate passes, runs with higher upside)
  else if (name.includes('slant') || name.includes('screen') || name.includes('draw') ||
           name.includes('counter') || name.includes('sweep') || name.includes('option')) {
    riskLevel = 4;
  }
  // Medium-low risk cards (standard runs, short passes)
  else if (name.includes('power') || name.includes('inside') || name.includes('zone') ||
           name.includes('button') || name.includes('hook') || name.includes('out')) {
    riskLevel = 2;
  }
  // Low risk cards (conservative plays)
  else if (name.includes('punt') || name.includes('field') || name.includes('goal')) {
    riskLevel = 1;
  }

  // Perimeter bias logic based on card characteristics
  let perimeterBias = 0.5; // Default balanced

  // High perimeter bias (outside runs, sideline passes)
  if (name.includes('end') || name.includes('sideline') || name.includes('out') ||
      name.includes('corner') || name.includes('fade') || name.includes('post') ||
      name.includes('wheel') || name.includes('screen')) {
    perimeterBias = 0.8;
  }
  // Medium-high perimeter bias (sweeps, outside zones)
  else if (name.includes('sweep') || name.includes('toss') || name.includes('stretch') ||
           name.includes('outside') || name.includes('perimeter')) {
    perimeterBias = 0.7;
  }
  // Medium-low perimeter bias (inside runs, middle passes)
  else if (name.includes('inside') || name.includes('middle') || name.includes('up middle') ||
           name.includes('power') || name.includes('counter') || name.includes('trap')) {
    perimeterBias = 0.3;
  }
  // Low perimeter bias (conservative inside plays)
  else if (name.includes('dive') || name.includes('iso') || name.includes('lead') ||
           name.includes('punch') || name.includes('wedge')) {
    perimeterBias = 0.2;
  }

  return { riskLevel, perimeterBias, theme };
}

// West Coast playbook cards
const WEST_COAST_CARDS: Omit<VisualPlaybookCard, 'id'>[] = [
  { playbook: 'West Coast', label: 'Quick Slant', type: 'pass', description: 'Short, quick pass over the middle',
    visual: getVisualProperties('Quick Slant', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Screen Pass', type: 'pass', description: 'Lateral pass behind the line of scrimmage',
    visual: getVisualProperties('Screen Pass', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Draw Play', type: 'run', description: 'Fake pass, run up the middle',
    visual: getVisualProperties('Draw Play', 'run', 'West Coast') },
  { playbook: 'West Coast', label: 'RB Screen', type: 'pass', description: 'Screen pass to the running back',
    visual: getVisualProperties('RB Screen', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'TE Seam', type: 'pass', description: 'Tight end down the seam',
    visual: getVisualProperties('TE Seam', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'HB Slip Screen', type: 'pass', description: 'Halfback screen after initial move',
    visual: getVisualProperties('HB Slip Screen', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'WR Out', type: 'pass', description: 'Wide receiver out route',
    visual: getVisualProperties('WR Out', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Zone Read', type: 'run', description: 'QB reads defense, keeps or hands off',
    visual: getVisualProperties('Zone Read', 'run', 'West Coast') },
  { playbook: 'West Coast', label: 'PA Bootleg', type: 'pass', description: 'Play action, QB rolls out',
    visual: getVisualProperties('PA Bootleg', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Dig Route', type: 'pass', description: 'Cross field pass route',
    visual: getVisualProperties('Dig Route', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Inside Zone', type: 'run', description: 'Offensive line zones block',
    visual: getVisualProperties('Inside Zone', 'run', 'West Coast') },
  { playbook: 'West Coast', label: 'Slants', type: 'pass', description: 'Multiple receivers run slant routes',
    visual: getVisualProperties('Slants', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Counter Trey', type: 'run', description: 'Misdirection run play',
    visual: getVisualProperties('Counter Trey', 'run', 'West Coast') },
  { playbook: 'West Coast', label: 'TE Corner', type: 'pass', description: 'Tight end corner route',
    visual: getVisualProperties('TE Corner', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Power O', type: 'run', description: 'Power running scheme',
    visual: getVisualProperties('Power O', 'run', 'West Coast') },
  { playbook: 'West Coast', label: 'WR Screen', type: 'pass', description: 'Wide receiver screen pass',
    visual: getVisualProperties('WR Screen', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Outside Zone', type: 'run', description: 'Stretch zone run to the edge',
    visual: getVisualProperties('Outside Zone', 'run', 'West Coast') },
  { playbook: 'West Coast', label: 'Stick Route', type: 'pass', description: 'Short stick route combination',
    visual: getVisualProperties('Stick Route', 'pass', 'West Coast') },
  { playbook: 'West Coast', label: 'Trap Play', type: 'run', description: 'Trap blocking scheme',
    visual: getVisualProperties('Trap Play', 'run', 'West Coast') },
  { playbook: 'West Coast', label: 'Flood Concept', type: 'pass', description: 'Three level flood routes',
    visual: getVisualProperties('Flood Concept', 'pass', 'West Coast') }
];

// Spread playbook cards
const SPREAD_CARDS: Omit<VisualPlaybookCard, 'id'>[] = [
  { playbook: 'Spread', label: 'Air Raid', type: 'pass', description: 'Four verticals concept',
    visual: getVisualProperties('Air Raid', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Mesh Concept', type: 'pass', description: 'Crossing routes underneath',
    visual: getVisualProperties('Mesh Concept', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'RPO Bubble', type: 'pass', description: 'Run-pass option with bubble',
    visual: getVisualProperties('RPO Bubble', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Smash Route', type: 'pass', description: 'Corner and hitch combination',
    visual: getVisualProperties('Smash Route', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Zone Read', type: 'run', description: 'QB reads edge defender',
    visual: getVisualProperties('Zone Read', 'run', 'Spread') },
  { playbook: 'Spread', label: 'Levels Concept', type: 'pass', description: 'Multiple levels of routes',
    visual: getVisualProperties('Levels Concept', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Y-Stick', type: 'pass', description: 'Y receiver stick route',
    visual: getVisualProperties('Y-Stick', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Power Read', type: 'run', description: 'Power scheme with read option',
    visual: getVisualProperties('Power Read', 'run', 'Spread') },
  { playbook: 'Spread', label: 'Drive Concept', type: 'pass', description: 'Drive routes to intermediate zone',
    visual: getVisualProperties('Drive Concept', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Counter', type: 'run', description: 'Counter run against spread defense',
    visual: getVisualProperties('Counter', 'run', 'Spread') },
  { playbook: 'Spread', label: 'Spot Concept', type: 'pass', description: 'Spot routes underneath',
    visual: getVisualProperties('Spot Concept', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Arrow Route', type: 'pass', description: 'Quick arrow route',
    visual: getVisualProperties('Arrow Route', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Outside Zone', type: 'run', description: 'Stretch zone to the perimeter',
    visual: getVisualProperties('Outside Zone', 'run', 'Spread') },
  { playbook: 'Spread', label: 'Bender', type: 'pass', description: 'Bender route combination',
    visual: getVisualProperties('Bender', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Inside Zone', type: 'run', description: 'Inside zone running scheme',
    visual: getVisualProperties('Inside Zone', 'run', 'Spread') },
  { playbook: 'Spread', label: 'Curl-Flat', type: 'pass', description: 'Curl and flat route combo',
    visual: getVisualProperties('Curl-Flat', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Trap', type: 'run', description: 'Trap block run play',
    visual: getVisualProperties('Trap', 'run', 'Spread') },
  { playbook: 'Spread', label: 'Post-Wheel', type: 'pass', description: 'Post and wheel combination',
    visual: getVisualProperties('Post-Wheel', 'pass', 'Spread') },
  { playbook: 'Spread', label: 'Power', type: 'run', description: 'Power gap scheme',
    visual: getVisualProperties('Power', 'run', 'Spread') },
  { playbook: 'Spread', label: 'Slants', type: 'pass', description: 'Multiple slant routes',
    visual: getVisualProperties('Slants', 'pass', 'Spread') }
];

// Additional playbook cards (Air Raid, Smashmouth, Wide Zone)
const AIR_RAID_CARDS: Omit<VisualPlaybookCard, 'id'>[] = [
  { playbook: 'Air Raid', label: 'Four Verticals', type: 'pass', description: 'Four receivers run vertical routes',
    visual: getVisualProperties('Four Verticals', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Mesh', type: 'pass', description: 'Crossing mesh routes',
    visual: getVisualProperties('Mesh', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Y-Stick', type: 'pass', description: 'Y-stick route concept',
    visual: getVisualProperties('Y-Stick', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Spot', type: 'pass', description: 'Spot routes underneath',
    visual: getVisualProperties('Spot', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Drive', type: 'pass', description: 'Drive routes to intermediate',
    visual: getVisualProperties('Drive', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Smash', type: 'pass', description: 'Smash route combination',
    visual: getVisualProperties('Smash', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Curl-Flat', type: 'pass', description: 'Curl and flat routes',
    visual: getVisualProperties('Curl-Flat', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Post-Corner', type: 'pass', description: 'Post and corner routes',
    visual: getVisualProperties('Post-Corner', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Levels', type: 'pass', description: 'Multiple level routes',
    visual: getVisualProperties('Levels', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Triangle', type: 'pass', description: 'Triangle route concept',
    visual: getVisualProperties('Triangle', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Bender', type: 'pass', description: 'Bender route combination',
    visual: getVisualProperties('Bender', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Slants', type: 'pass', description: 'Slant route concept',
    visual: getVisualProperties('Slants', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Arrow', type: 'pass', description: 'Arrow route underneath',
    visual: getVisualProperties('Arrow', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Wheel', type: 'pass', description: 'Wheel route combination',
    visual: getVisualProperties('Wheel', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Flood', type: 'pass', description: 'Flood route concept',
    visual: getVisualProperties('Flood', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Out', type: 'pass', description: 'Out route combination',
    visual: getVisualProperties('Out', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Dig', type: 'pass', description: 'Dig route across field',
    visual: getVisualProperties('Dig', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Cross', type: 'pass', description: 'Crosser route concept',
    visual: getVisualProperties('Cross', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Post', type: 'pass', description: 'Post route downfield',
    visual: getVisualProperties('Post', 'pass', 'Air Raid') },
  { playbook: 'Air Raid', label: 'Corner', type: 'pass', description: 'Corner route downfield',
    visual: getVisualProperties('Corner', 'pass', 'Air Raid') }
];

// Defensive cards with visual properties
const DEFENSIVE_CARDS: Omit<VisualDefensiveCard, 'id'>[] = [
  { label: 'Goal Line' as DefensivePlay, visual: { riskLevel: 2, perimeterBias: 0.5, theme: 'defense' } },
  { label: 'All-Out Blitz' as DefensivePlay, visual: { riskLevel: 5, perimeterBias: 0.5, theme: 'defense' } },
  { label: 'Inside Blitz' as DefensivePlay, visual: { riskLevel: 4, perimeterBias: 0.3, theme: 'defense' } },
  { label: 'Outside Blitz' as DefensivePlay, visual: { riskLevel: 4, perimeterBias: 0.8, theme: 'defense' } },
  { label: 'Cover 1' as DefensivePlay, visual: { riskLevel: 3, perimeterBias: 0.6, theme: 'defense' } },
  { label: 'Cover 2' as DefensivePlay, visual: { riskLevel: 3, perimeterBias: 0.5, theme: 'defense' } },
  { label: 'Cover 3' as DefensivePlay, visual: { riskLevel: 3, perimeterBias: 0.7, theme: 'defense' } },
  { label: 'Cover 4' as DefensivePlay, visual: { riskLevel: 3, perimeterBias: 0.5, theme: 'defense' } },
  { label: 'Cover 6' as DefensivePlay, visual: { riskLevel: 3, perimeterBias: 0.6, theme: 'defense' } },
  { label: 'Prevent' as DefensivePlay, visual: { riskLevel: 2, perimeterBias: 0.4, theme: 'defense' } }
];

/**
 * Card definitions registry
 * Provides access to all visual card definitions
 */
export class CardDefinitions {
  private static instance: CardDefinitions;
  private cards = new Map<string, VisualPlaybookCard | VisualDefensiveCard>();

  private constructor() {
    this.loadAllCards();
  }

  static getInstance(): CardDefinitions {
    if (!CardDefinitions.instance) {
      CardDefinitions.instance = new CardDefinitions();
    }
    return CardDefinitions.instance;
  }

  private loadAllCards(): void {
    // Load offensive cards
    const allOffensiveCards = [
      ...WEST_COAST_CARDS,
      ...SPREAD_CARDS,
      ...AIR_RAID_CARDS,
      // Add Smashmouth and Wide Zone cards (simplified for brevity)
      ...this.generateSmashmouthCards(),
      ...this.generateWideZoneCards()
    ];

    allOffensiveCards.forEach((card, index) => {
      const id = `offensive-${card.playbook?.toLowerCase()}-${index}`;
      this.cards.set(id, { ...card, id } as VisualPlaybookCard);
    });

    // Load defensive cards
    DEFENSIVE_CARDS.forEach((card, index) => {
      const id = `defensive-${index}`;
      this.cards.set(id, { ...card, id } as VisualDefensiveCard);
    });
  }

  private generateSmashmouthCards(): Omit<VisualPlaybookCard, 'id'>[] {
    return [
      { playbook: 'Smashmouth', label: 'Power O', type: 'run', description: 'Power gap scheme',
        visual: getVisualProperties('Power O', 'run', 'Smashmouth') },
      { playbook: 'Smashmouth', label: 'Counter', type: 'run', description: 'Counter run play',
        visual: getVisualProperties('Counter', 'run', 'Smashmouth') },
      { playbook: 'Smashmouth', label: 'Trap', type: 'run', description: 'Trap blocking scheme',
        visual: getVisualProperties('Trap', 'run', 'Smashmouth') },
      { playbook: 'Smashmouth', label: 'Inside Zone', type: 'run', description: 'Inside zone runs',
        visual: getVisualProperties('Inside Zone', 'run', 'Smashmouth') },
      { playbook: 'Smashmouth', label: 'Outside Zone', type: 'run', description: 'Outside zone runs',
        visual: getVisualProperties('Outside Zone', 'run', 'Smashmouth') }
    ];
  }

  private generateWideZoneCards(): Omit<VisualPlaybookCard, 'id'>[] {
    return [
      { playbook: 'Wide Zone', label: 'Wide Zone', type: 'run', description: 'Wide zone running scheme',
        visual: getVisualProperties('Wide Zone', 'run', 'Wide Zone') },
      { playbook: 'Wide Zone', label: 'Stretch Zone', type: 'run', description: 'Stretch zone to perimeter',
        visual: getVisualProperties('Stretch Zone', 'run', 'Wide Zone') },
      { playbook: 'Wide Zone', label: 'Inside Zone', type: 'run', description: 'Inside zone runs',
        visual: getVisualProperties('Inside Zone', 'run', 'Wide Zone') },
      { playbook: 'Wide Zone', label: 'Counter', type: 'run', description: 'Counter misdirection',
        visual: getVisualProperties('Counter', 'run', 'Wide Zone') },
      { playbook: 'Wide Zone', label: 'Power', type: 'run', description: 'Power gap scheme',
        visual: getVisualProperties('Power', 'run', 'Wide Zone') }
    ];
  }

  /**
   * Gets all offensive cards for a specific playbook
   */
  getOffensiveCards(playbook: PlaybookName): VisualPlaybookCard[] {
    return Array.from(this.cards.values())
      .filter((card): card is VisualPlaybookCard =>
        'playbook' in card && card.playbook === playbook
      );
  }

  /**
   * Gets all defensive cards
   */
  getDefensiveCards(): VisualDefensiveCard[] {
    return Array.from(this.cards.values())
      .filter((card): card is VisualDefensiveCard =>
        !('playbook' in card)
      );
  }

  /**
   * Gets a specific card by ID
   */
  getCard(id: string): VisualPlaybookCard | VisualDefensiveCard | undefined {
    return this.cards.get(id);
  }

  /**
   * Gets all available cards
   */
  getAllCards(): (VisualPlaybookCard | VisualDefensiveCard)[] {
    return Array.from(this.cards.values());
  }

  /**
   * Gets cards by type
   */
  getCardsByType(type: CardType): VisualPlaybookCard[] {
    return Array.from(this.cards.values())
      .filter((card): card is VisualPlaybookCard =>
        'type' in card && card.type === type
      );
  }

  /**
   * Gets cards by risk level range
   */
  getCardsByRiskLevel(minLevel: 1 | 2 | 3 | 4 | 5, maxLevel: 1 | 2 | 3 | 4 | 5): (VisualPlaybookCard | VisualDefensiveCard)[] {
    return Array.from(this.cards.values())
      .filter(card => card.visual.riskLevel >= minLevel && card.visual.riskLevel <= maxLevel);
  }

  /**
   * Gets cards by perimeter bias range
   */
  getCardsByPerimeterBias(minBias: number, maxBias: number): (VisualPlaybookCard | VisualDefensiveCard)[] {
    return Array.from(this.cards.values())
      .filter(card => card.visual.perimeterBias >= minBias && card.visual.perimeterBias <= maxBias);
  }
}
