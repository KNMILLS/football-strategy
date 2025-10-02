/**
 * Penalty Advisor for optimal accept/decline decisions
 * Uses game state analysis and EV calculations to recommend penalty decisions
 */
export class PenaltyAdvisor {
    /**
     * Analyze penalty situation and recommend accept/decline
     */
    analyzePenalty(context) {
        const evAccept = this.calculateEVIfAccepted(context);
        const evDecline = this.calculateEVIfDeclined(context);
        const evDifference = evAccept - evDecline;
        const shouldAccept = evDifference > 0;
        // Apply coach personality adjustments
        const personalityAdjustment = this.applyCoachPersonality(context, evDifference);
        const adjustedEVDifference = evDifference * (1 + personalityAdjustment);
        const finalDecision = adjustedEVDifference > 0 ? 'accept' : 'decline';
        const confidence = Math.min(Math.abs(adjustedEVDifference) * 2, 1); // Scale to 0-1
        return {
            action: finalDecision,
            confidence,
            evDifference: adjustedEVDifference,
            reasoning: this.generateReasoning(context, evAccept, evDecline, finalDecision)
        };
    }
    /**
     * Calculate expected value if penalty is accepted
     */
    calculateEVIfAccepted(context) {
        const { gameState, penaltyInfo, fieldPosition, penaltyYards, isSpotFoul, baseOutcome } = context;
        // If we have a base outcome, use it for more accurate EV calculation
        if (baseOutcome) {
            return this.calculateEVWithBaseOutcome(context, baseOutcome, 'accept');
        }
        // Fallback to field position-based calculation
        let newFieldPosition = fieldPosition;
        if (penaltyInfo.side === 'offense') {
            // Penalty against defense - move ball forward
            newFieldPosition = Math.min(100, fieldPosition + penaltyYards);
        }
        else {
            // Penalty against offense - move ball backward
            newFieldPosition = Math.max(0, fieldPosition - penaltyYards);
        }
        // Automatic first down for spot fouls
        const newDown = isSpotFoul ? 1 : gameState.down;
        const newToGo = isSpotFoul ? 10 : gameState.toGo;
        return this.calculateFieldPositionEV({
            ...context,
            fieldPosition: newFieldPosition,
            down: newDown,
            toGo: newToGo
        });
    }
    /**
     * Calculate expected value if penalty is declined
     */
    calculateEVIfDeclined(context) {
        const { baseOutcome } = context;
        // If we have a base outcome, use it for more accurate EV calculation
        if (baseOutcome) {
            return this.calculateEVWithBaseOutcome(context, baseOutcome, 'decline');
        }
        // Fallback to field position-based calculation
        return this.calculateFieldPositionEV(context);
    }
    /**
     * Calculate EV using base outcome from dice roll (Phase C2 requirement)
     */
    calculateEVWithBaseOutcome(context, baseOutcome, decision) {
        const { gameState, penaltyInfo, fieldPosition, penaltyYards } = context;
        let finalYards = baseOutcome.yards;
        let finalClock = baseOutcome.clock;
        if (decision === 'accept') {
            // Apply penalty modification to base outcome
            if (penaltyInfo.side === 'offense') {
                // Penalty against defense - add penalty yards to base outcome
                finalYards += penaltyYards;
            }
            else {
                // Penalty against offense - subtract penalty yards from base outcome
                finalYards -= penaltyYards;
            }
            // Clock is affected by penalty acceptance
            finalClock = Math.max(10, finalClock - 5); // Penalty acceptance slightly reduces clock
        }
        // For decline, use base outcome as-is
        // Calculate field position after yards change
        const newFieldPosition = Math.max(0, Math.min(100, fieldPosition + finalYards));
        // Calculate EV based on final field position and down state
        return this.calculateFieldPositionEV({
            ...context,
            fieldPosition: newFieldPosition,
            down: gameState.down, // Keep current down for now (could be enhanced)
            toGo: gameState.toGo
        });
    }
    /**
     * Calculate expected value based on field position and game situation
     */
    calculateFieldPositionEV(context) {
        const { fieldPosition, timeRemaining, scoreDifferential } = context;
        // Base field position value (0-100 scale)
        let ev = this.fieldPositionValue(fieldPosition);
        // Time pressure factor (more valuable late in game)
        const timeFactor = Math.max(0.5, timeRemaining / (30 * 60)); // Normalize to 0.5-1.0
        ev *= timeFactor;
        // Score pressure factor (more aggressive when behind)
        const scoreFactor = scoreDifferential < 0 ? 1.2 : 1.0; // Slight bonus when trailing
        ev *= scoreFactor;
        // Down and distance factor
        const downDistanceFactor = this.downDistanceValue(context.down, context.toGo);
        ev *= downDistanceFactor;
        return ev;
    }
    /**
     * Calculate value of field position (0 = own goal line, 100 = opponent's goal line)
     */
    fieldPositionValue(position) {
        // Piecewise linear field position value
        // Goal line areas are risky (turnover danger)
        if (position <= 10)
            return position * 2; // 0-20 value
        if (position <= 30)
            return 20 + (position - 10) * 3; // 20-80 value
        if (position <= 70)
            return 80 + (position - 30) * 1; // 80-120 value
        if (position <= 90)
            return 120 + (position - 70) * 3; // 120-180 value
        return 180 + (position - 90) * 2; // 180-200 value
    }
    /**
     * Calculate value adjustment based on down and distance
     */
    downDistanceValue(down, toGo) {
        // Early downs with manageable distance are valuable
        if (down === 1) {
            return toGo <= 10 ? 1.2 : 0.9;
        }
        if (down === 2) {
            return toGo <= 7 ? 1.1 : 0.8;
        }
        if (down === 3) {
            return toGo <= 5 ? 1.0 : 0.7;
        }
        // Fourth down - only valuable in scoring position or with time pressure
        return 0.6;
    }
    /**
     * Apply coach personality adjustments to EV calculations
     */
    applyCoachPersonality(context, baseEVDifference) {
        const { coachProfile } = context;
        // Risk tolerance affects willingness to accept penalties
        const riskAdjustment = (coachProfile.riskTolerance - 0.5) * 0.3;
        // Aggression affects penalty acceptance
        const aggressionAdjustment = (coachProfile.aggression - 0.5) * 0.2;
        // Clock management affects late-game decisions
        const clockAdjustment = context.timeRemaining <= 300
            ? (coachProfile.clockManagementAggression - 0.5) * 0.4
            : 0;
        return riskAdjustment + aggressionAdjustment + clockAdjustment;
    }
    /**
     * Generate human-readable reasoning for the penalty decision
     */
    generateReasoning(context, evAccept, evDecline, decision) {
        const { penaltyInfo, fieldPosition, timeRemaining, scoreDifferential, down, toGo } = context;
        const fieldZone = this.getFieldZoneDescription(fieldPosition);
        const timeSituation = timeRemaining <= 300 ? 'late game' : 'normal time';
        const scoreSituation = scoreDifferential > 0 ? 'leading' : scoreDifferential < 0 ? 'trailing' : 'tied';
        if (decision === 'accept') {
            return `Accept ${penaltyInfo.label} for better field position in ${fieldZone} during ${timeSituation} while ${scoreSituation}. EV gain: ${(evAccept - evDecline).toFixed(2)}`;
        }
        else {
            return `Decline ${penaltyInfo.label} - current down ${down} & ${toGo} situation in ${fieldZone} during ${timeSituation} while ${scoreSituation} is more valuable.`;
        }
    }
    /**
     * Get descriptive field zone name
     */
    getFieldZoneDescription(position) {
        if (position <= 20)
            return 'own territory';
        if (position <= 40)
            return 'own side of midfield';
        if (position <= 60)
            return 'opponent side of midfield';
        if (position <= 80)
            return 'opponent territory';
        return 'red zone';
    }
    /**
     * Quick penalty decision for simple cases
     */
    shouldAcceptPenalty(context) {
        const decision = this.analyzePenalty(context);
        return decision.action === 'accept' && decision.confidence > 0.6;
    }
}
//# sourceMappingURL=PenaltyAdvisor.js.map