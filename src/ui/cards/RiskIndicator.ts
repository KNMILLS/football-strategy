import type { CardStyles } from './types';

/**
 * Risk level indicator component
 * Displays a visual representation of card risk level (1-5)
 */
export class RiskIndicator {
  private styles: CardStyles;

  constructor(styles: CardStyles) {
    this.styles = styles;
  }

  /**
   * Renders the risk indicator as SVG
   */
  render(riskLevel: 1 | 2 | 3 | 4 | 5, x: number, y: number, barWidth: number = 60, barHeight: number = 8): string {
    const riskColor = this.getRiskColor(riskLevel);
    const filledWidth = (riskLevel / 5) * barWidth;

    return `
      <!-- Risk indicator -->
      <g id="risk-indicator" transform="translate(${x}, ${y})">
        <rect width="${barWidth}" height="${barHeight}" rx="4"
              fill="${this.styles.riskIndicator.low}" stroke="${this.styles.border}" stroke-width="1"/>
        <rect width="${filledWidth}" height="${barHeight}" rx="4" fill="${riskColor}">
          <animate attributeName="width" values="0;${filledWidth}" dur="0.3s" fill="freeze"/>
        </rect>
        <text x="${barWidth + 8}" y="${barHeight - 2}" font-family="Arial, sans-serif"
              font-size="12" fill="${this.styles.text.primary}">
          Risk: ${riskLevel}/5
        </text>
      </g>
    `;
  }

  /**
   * Renders a compact risk indicator for smaller spaces
   */
  renderCompact(riskLevel: 1 | 2 | 3 | 4 | 5, x: number, y: number, size: number = 16): string {
    const riskColor = this.getRiskColor(riskLevel);
    const radius = size / 2;

    return `
      <!-- Compact risk indicator -->
      <g id="risk-indicator-compact" transform="translate(${x}, ${y})">
        <circle cx="${radius}" cy="${radius}" r="${radius}"
                fill="${this.styles.riskIndicator.low}" stroke="${this.styles.border}" stroke-width="1"/>
        <path d="M ${radius - 3} ${radius - 3} L ${radius} ${radius} L ${radius + 3} ${radius - 3}"
              stroke="${riskColor}" stroke-width="2" fill="none"
              stroke-linecap="round" stroke-linejoin="round"/>
        ${Array.from({ length: riskLevel }, (_, i) => `
          <circle cx="${radius + (i - 2) * 6}" cy="${radius}" r="2" fill="${riskColor}"/>
        `).join('')}
      </g>
    `;
  }

  /**
   * Gets the appropriate color for risk level
   */
  private getRiskColor(riskLevel: number): string {
    if (riskLevel <= 2) return this.styles.riskIndicator.low;
    if (riskLevel <= 3) return this.styles.riskIndicator.medium;
    return this.styles.riskIndicator.high;
  }

  /**
   * Validates risk level input
   */
  static validateRiskLevel(level: number): level is 1 | 2 | 3 | 4 | 5 {
    return level >= 1 && level <= 5 && Number.isInteger(level);
  }
}
