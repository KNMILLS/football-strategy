// Main narration system exports
export { chooseCommentaryLines, buildBroadcastCall } from '../flow/narration/Broadcast';

// New dice-based commentary system
export { DiceTagMapper } from './dice/TagMapper';
export type {
  DiceTag,
  TagContext,
  TagCategory
} from './dice/TagMapper';
export {
  TAG_CATEGORIES,
  isTurnover,
  isCompletion,
  isIncompletion,
  isExplosive,
  isPenalty,
  getPrimaryAction,
  getPlayDepth,
  getDefensiveContext,
  isInRedZone,
  isTwoMinuteWarning,
  buildTagContext
} from './dice/TagMapper';

export {
  generateCommentary,
  generatePenaltyCommentary,
  generateTurnoverReturnCommentary,
  generateOOBCommentary,
  COMMENTARY_TEMPLATES,
  ANALYST_TEMPLATES
} from './dice/CommentaryEngine';
export type { CommentaryTemplate } from './dice/CommentaryEngine';

export {
  RUN_TEMPLATES,
  RUN_ANALYST_TEMPLATES
} from './dice/templates/RunTemplates';
