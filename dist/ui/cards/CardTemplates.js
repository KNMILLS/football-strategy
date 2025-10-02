/**
 * SVG card template builder
 * Creates consistent card layouts with proper spacing and visual hierarchy
 */
export class CardTemplateBuilder {
    dimensions;
    styles;
    constructor(dimensions, styles) {
        this.dimensions = dimensions;
        this.styles = styles;
    }
    /**
     * Creates the base SVG card structure
     */
    createBaseCard() {
        const { width, height, borderRadius } = this.dimensions;
        return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
           xmlns="http://www.w3.org/2000/svg" role="img"
           aria-labelledby="card-title" aria-describedby="card-description">
        <defs>
          <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.25"/>
          </filter>
          <linearGradient id="card-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${this.styles.background};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.styles.border};stop-opacity:1" />
          </linearGradient>
        </defs>

        <!-- Card background -->
        <rect width="${width}" height="${height}" rx="${borderRadius}"
              fill="url(#card-gradient)" stroke="${this.styles.border}"
              stroke-width="2" filter="url(#card-shadow)"/>

        <!-- Card content will be inserted here -->
    `;
    }
    /**
     * Creates the card title section
     */
    createTitleSection(title, x, y, maxWidth) {
        return `
        <!-- Card title -->
        <text id="card-title" x="${x}" y="${y}" font-family="Arial, sans-serif"
              font-size="18" font-weight="bold" fill="${this.styles.text.primary}"
              text-anchor="middle" dominant-baseline="middle">
          <tspan x="${x + maxWidth / 2}" dy="0">${this.truncateText(title, maxWidth, 18)}</tspan>
        </text>
    `;
    }
    /**
     * Creates the card description section
     */
    createDescriptionSection(description, x, y, maxWidth, maxHeight) {
        const words = description.split(' ');
        const lines = this.wrapText(words, maxWidth, 14);
        const lineHeight = 18;
        if (lines.length * lineHeight > maxHeight) {
            lines.splice(3); // Keep only first 3 lines
            if (lines.length > 0) {
                lines[lines.length - 1] += '...';
            }
        }
        return `
        <!-- Card description -->
        <text id="card-description" x="${x}" y="${y}" font-family="Arial, sans-serif"
              font-size="14" fill="${this.styles.text.secondary}" text-anchor="start">
          ${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${this.truncateText(line, maxWidth, 14)}</tspan>`).join('')}
        </text>
    `;
    }
    /**
     * Creates the risk level indicator
     */
    createRiskIndicator(riskLevel, x, y) {
        const riskColor = this.getRiskColor(riskLevel);
        const barWidth = 60;
        const barHeight = 8;
        const filledWidth = (riskLevel / 5) * barWidth;
        return `
        <!-- Risk indicator -->
        <g id="risk-indicator" transform="translate(${x}, ${y})">
          <rect width="${barWidth}" height="${barHeight}" rx="4"
                fill="${this.styles.riskIndicator.low}" stroke="${this.styles.border}" stroke-width="1"/>
          <rect width="${filledWidth}" height="${barHeight}" rx="4" fill="${riskColor}"/>
          <text x="${barWidth + 8}" y="${barHeight - 2}" font-family="Arial, sans-serif"
                font-size="12" fill="${this.styles.text.primary}">
            Risk: ${riskLevel}/5
          </text>
        </g>
    `;
    }
    /**
     * Creates the perimeter bias badge
     */
    createPerimeterBadge(perimeterBias, x, y) {
        const badgeRadius = 12;
        const badgeX = x + badgeRadius;
        const badgeY = y + badgeRadius;
        // Convert bias to percentage for display
        const biasPercent = Math.round(perimeterBias * 100);
        return `
        <!-- Perimeter badge -->
        <g id="perimeter-badge" transform="translate(${x}, ${y})">
          <circle cx="${badgeRadius}" cy="${badgeRadius}" r="${badgeRadius}"
                  fill="${this.styles.perimeterBadge.background}"
                  stroke="${this.styles.perimeterBadge.border}" stroke-width="2"/>
          <text x="${badgeRadius}" y="${badgeRadius + 4}" font-family="Arial, sans-serif"
                font-size="14" font-weight="bold" fill="${this.styles.text.primary}"
                text-anchor="middle" dominant-baseline="middle">
            ${biasPercent}%
          </text>
          <text x="${badgeRadius}" y="${badgeRadius + 20}" font-family="Arial, sans-serif"
                font-size="8" fill="${this.styles.text.secondary}"
                text-anchor="middle" dominant-baseline="middle">
            OOB
          </text>
        </g>
    `;
    }
    /**
     * Creates the complete offensive playbook card
     */
    createOffensiveCard(card) {
        const { width, height, padding } = this.dimensions;
        const contentWidth = width - (padding * 2);
        const contentHeight = height - (padding * 2);
        let svg = this.createBaseCard();
        // Layout positions
        const titleY = padding + 25;
        const descriptionY = titleY + 30;
        const riskIndicatorY = descriptionY + 60;
        const perimeterBadgeY = riskIndicatorY + 25;
        // Add card elements
        svg += this.createTitleSection(card.title, padding, titleY, contentWidth);
        if (card.description) {
            svg += this.createDescriptionSection(card.description, padding, descriptionY, contentWidth, 50);
        }
        svg += this.createRiskIndicator(card.riskLevel, padding, riskIndicatorY);
        svg += this.createPerimeterBadge(card.perimeterBias, width - padding - 24, perimeterBadgeY);
        svg += '\n      </svg>';
        return svg;
    }
    /**
     * Creates the complete defensive card
     */
    createDefensiveCard(card) {
        const { width, height, padding } = this.dimensions;
        const contentWidth = width - (padding * 2);
        let svg = this.createBaseCard();
        // Layout positions (defensive cards are simpler)
        const titleY = padding + 40;
        const riskIndicatorY = titleY + 40;
        const perimeterBadgeY = riskIndicatorY + 25;
        // Add card elements
        svg += this.createTitleSection(card.title, padding, titleY, contentWidth);
        svg += this.createRiskIndicator(card.riskLevel, padding, riskIndicatorY);
        svg += this.createPerimeterBadge(card.perimeterBias, width - padding - 24, perimeterBadgeY);
        svg += '\n      </svg>';
        return svg;
    }
    /**
     * Gets the appropriate color for risk level
     */
    getRiskColor(riskLevel) {
        if (riskLevel <= 2)
            return this.styles.riskIndicator.low;
        if (riskLevel <= 3)
            return this.styles.riskIndicator.medium;
        return this.styles.riskIndicator.high;
    }
    /**
     * Truncates text to fit within max width
     */
    truncateText(text, maxWidth, fontSize) {
        // Simple truncation - in a real implementation, we'd measure actual text width
        const maxChars = Math.floor(maxWidth / (fontSize * 0.6));
        if (text.length <= maxChars)
            return text;
        return text.substring(0, maxChars - 3) + '...';
    }
    /**
     * Wraps text into multiple lines
     */
    wrapText(words, maxWidth, fontSize) {
        const maxCharsPerLine = Math.floor(maxWidth / (fontSize * 0.6));
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
            }
            else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        return lines;
    }
}
/**
 * Card template factory for different card types
 */
export class CardTemplateFactory {
    builder;
    constructor(dimensions, styles) {
        this.builder = new CardTemplateBuilder(dimensions, styles);
    }
    /**
     * Creates an offensive playbook card template
     */
    createOffensiveTemplate() {
        return (card) => this.builder.createOffensiveCard(card);
    }
    /**
     * Creates a defensive card template
     */
    createDefensiveTemplate() {
        return (card) => this.builder.createDefensiveCard(card);
    }
}
//# sourceMappingURL=CardTemplates.js.map