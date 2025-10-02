/**
 * Perimeter bias badge component
 * Displays a circular indicator showing out-of-bounds (OOB) bias as a percentage
 */
export class PerimeterBadge {
    styles;
    constructor(styles) {
        this.styles = styles;
    }
    /**
     * Renders the perimeter badge as SVG
     */
    render(perimeterBias, x, y, radius = 12) {
        // Clamp perimeter bias to valid range
        const bias = Math.max(0, Math.min(1, perimeterBias));
        const biasPercent = Math.round(bias * 100);
        return `
      <!-- Perimeter badge -->
      <g id="perimeter-badge" transform="translate(${x}, ${y})">
        <circle cx="${radius}" cy="${radius}" r="${radius}"
                fill="${this.styles.perimeterBadge.background}"
                stroke="${this.styles.perimeterBadge.border}" stroke-width="2">
          <animate attributeName="r" values="0;${radius}" dur="0.2s" fill="freeze"/>
        </circle>
        <text x="${radius}" y="${radius + 4}" font-family="Arial, sans-serif"
              font-size="14" font-weight="bold" fill="${this.styles.text.primary}"
              text-anchor="middle" dominant-baseline="middle">
          ${biasPercent}%
        </text>
        <text x="${radius}" y="${radius + 20}" font-family="Arial, sans-serif"
              font-size="8" fill="${this.styles.text.secondary}"
              text-anchor="middle" dominant-baseline="middle">
          OOB
        </text>
      </g>
    `;
    }
    /**
     * Renders a compact version for smaller spaces
     */
    renderCompact(perimeterBias, x, y, size = 20) {
        const bias = Math.max(0, Math.min(1, perimeterBias));
        const biasPercent = Math.round(bias * 100);
        const radius = size / 2;
        return `
      <!-- Compact perimeter badge -->
      <g id="perimeter-badge-compact" transform="translate(${x}, ${y})">
        <circle cx="${radius}" cy="${radius}" r="${radius}"
                fill="${this.styles.perimeterBadge.background}"
                stroke="${this.styles.perimeterBadge.border}" stroke-width="1"/>
        <text x="${radius}" y="${radius + 3}" font-family="Arial, sans-serif"
              font-size="10" font-weight="bold" fill="${this.styles.text.primary}"
              text-anchor="middle" dominant-baseline="middle">
          ${biasPercent}
        </text>
      </g>
    `;
    }
    /**
     * Renders an animated perimeter badge with pulsing effect for high bias
     */
    renderAnimated(perimeterBias, x, y, radius = 12) {
        const bias = Math.max(0, Math.min(1, perimeterBias));
        const biasPercent = Math.round(bias * 100);
        // Add pulsing animation for high perimeter bias (> 70%)
        const shouldPulse = bias > 0.7;
        return `
      <!-- Animated perimeter badge -->
      <g id="perimeter-badge-animated" transform="translate(${x}, ${y})">
        <circle cx="${radius}" cy="${radius}" r="${radius}"
                fill="${this.styles.perimeterBadge.background}"
                stroke="${this.styles.perimeterBadge.border}" stroke-width="2">
          ${shouldPulse ? `
            <animate attributeName="r" values="${radius};${radius * 1.1};${radius}"
                     dur="1s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="1;0.7;1"
                     dur="1s" repeatCount="indefinite"/>
          ` : ''}
        </circle>
        <text x="${radius}" y="${radius + 4}" font-family="Arial, sans-serif"
              font-size="14" font-weight="bold" fill="${this.styles.text.primary}"
              text-anchor="middle" dominant-baseline="middle">
          ${biasPercent}%
        </text>
        <text x="${radius}" y="${radius + 20}" font-family="Arial, sans-serif"
              font-size="8" fill="${this.styles.text.secondary}"
              text-anchor="middle" dominant-baseline="middle">
          OOB
        </text>
      </g>
    `;
    }
    /**
     * Validates perimeter bias input
     */
    static validatePerimeterBias(bias) {
        return !isNaN(bias) && bias >= 0 && bias <= 1;
    }
    /**
     * Gets a descriptive label for perimeter bias level
     */
    static getBiasLabel(bias) {
        const validBias = Math.max(0, Math.min(1, bias));
        if (validBias <= 0.2)
            return 'Interior';
        if (validBias <= 0.4)
            return 'Mixed';
        if (validBias <= 0.6)
            return 'Balanced';
        if (validBias <= 0.8)
            return 'Perimeter';
        return 'Extreme Perimeter';
    }
}
//# sourceMappingURL=PerimeterBadge.js.map