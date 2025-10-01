export type PlayType = 'run' | 'pass' | 'pa' | 'trick';
export type Depth = 'short' | 'mid' | 'deep';
export type RiskProfile = 'low' | 'medium' | 'high';

export interface PlayDefinition {
  id: string;
  name: string;
  description: string;
  type: PlayType;
  depth: Depth;
  risk_profile: RiskProfile;
  perimeter?: boolean;
}

export interface DeckDefinition {
  id: string;
  name: string;
  description: string;
  play_count: number;
  plays: PlayDefinition[];
}
