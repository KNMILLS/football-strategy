/*
 * main.js
 *
 * Core logic for the Gridiron Strategy full game. This script defines the
 * data structures for offensive and defensive decks, manages the game state,
 * handles drag‑and‑drop play resolution, controls special teams actions
 * (punts, field goals, extra points), updates the HUD and log, and provides
 * a simple AI opponent. The game is deterministic given a seed so that
 * results can be reproduced. To start a new game, select a deck and seed
 * then click the "New Game" button. Drag cards from your hand onto the play
 * zone to run plays. After scoring a touchdown you'll be prompted to kick an
 * extra point or attempt a two‑point conversion. Field goal attempts are
 * available on fourth down when close enough to the opponent's end zone.
 */

// ---------- Deck definitions ----------
// These objects were generated from the high‑resolution card images. Each
// offensive deck contains a list of play cards with an id, display label,
// image path and a type. Type is one of: 'run', 'pass' or 'punt'. Punts
// initiate a change of possession. Defensive cards are categorised as
// 'run' (run focus), 'pass' (pass focus) or 'balanced'.

const OFFENSE_DECKS = {
  "Pro Style": [
    { id: "Pro_Style_ButtonHookPass", label: "Button Hook Pass", art: "assets/cards/Pro Style/Button Hook Pass.jpg", type: "pass" },
    { id: "Pro_Style_DownInPass", label: "Down & In Pass", art: "assets/cards/Pro Style/Down & In Pass.jpg", type: "pass" },
    { id: "Pro_Style_DownOutPass", label: "Down & Out Pass", art: "assets/cards/Pro Style/Down & Out Pass.jpg", type: "pass" },
    { id: "Pro_Style_Draw", label: "Draw", art: "assets/cards/Pro Style/Draw.jpg", type: "run" },
    { id: "Pro_Style_EndRun", label: "End Run", art: "assets/cards/Pro Style/End Run.jpg", type: "run" },
    { id: "Pro_Style_FlairPass", label: "Flair Pass", art: "assets/cards/Pro Style/Flair Pass.jpg", type: "pass" },
    { id: "Pro_Style_LongBomb", label: "Long Bomb", art: "assets/cards/Pro Style/Long Bomb.jpg", type: "pass" },
    { id: "Pro_Style_LookInPass", label: "Look In Pass", art: "assets/cards/Pro Style/Look In Pass.jpg", type: "pass" },
    { id: "Pro_Style_PopPass", label: "Pop Pass", art: "assets/cards/Pro Style/Pop Pass.jpg", type: "pass" },
    { id: "Pro_Style_PowerOffTackle", label: "Power Off Tackle", art: "assets/cards/Pro Style/Power Off Tackle.jpg", type: "run" },
    { id: "Pro_Style_PowerUpMiddle", label: "Power Up Middle", art: "assets/cards/Pro Style/Power Up Middle.jpg", type: "run" },
    { id: "Pro_Style_Punt4thDownOnly", label: "Punt (4th Down Only)", art: "assets/cards/Pro Style/Punt (4th Down Only).jpg", type: "punt" },
    { id: "Pro_Style_PuntAnyDown", label: "Punt (Any Down)", art: "assets/cards/Pro Style/Punt (Any Down).jpg", type: "punt" },
    { id: "Pro_Style_QBKeeper", label: "QB Keeper", art: "assets/cards/Pro Style/QB Keeper.jpg", type: "run" },
    { id: "Pro_Style_RazzleDazzle", label: "Razzle Dazzle", art: "assets/cards/Pro Style/Razzle Dazzle.jpg", type: "run" },
    { id: "Pro_Style_Reverse", label: "Reverse", art: "assets/cards/Pro Style/Reverse.jpg", type: "run" },
    { id: "Pro_Style_RunPassOption", label: "Run & Pass Option", art: "assets/cards/Pro Style/Run & Pass Option.jpg", type: "run" },
    { id: "Pro_Style_ScreenPass", label: "Screen Pass", art: "assets/cards/Pro Style/Screen Pass.jpg", type: "pass" },
    { id: "Pro_Style_SidelinePass", label: "Sideline Pass", art: "assets/cards/Pro Style/Sideline Pass.jpg", type: "pass" },
    { id: "Pro_Style_SlantRun", label: "Slant Run", art: "assets/cards/Pro Style/Slant Run.jpg", type: "run" },
    // Removed Stop & Go Pass and Trap to reduce deck to 20 cards
  ],
  "Ball Control": [
    { id: "Ball_Control_ButtonHookPass", label: "Button Hook Pass", art: "assets/cards/Ball Control/Button Hook Pass.jpg", type: "pass" },
    { id: "Ball_Control_DownInPass", label: "Down & In Pass", art: "assets/cards/Ball Control/Down & In Pass.jpg", type: "pass" },
    { id: "Ball_Control_DownOutPass", label: "Down & Out Pass", art: "assets/cards/Ball Control/Down & Out Pass.jpg", type: "pass" },
    { id: "Ball_Control_Draw", label: "Draw", art: "assets/cards/Ball Control/Draw.jpg", type: "run" },
    { id: "Ball_Control_EndRun", label: "End Run", art: "assets/cards/Ball Control/End Run.jpg", type: "run" },
    { id: "Ball_Control_FlairPass", label: "Flair Pass", art: "assets/cards/Ball Control/Flair Pass.jpg", type: "pass" },
    { id: "Ball_Control_LongBomb", label: "Long Bomb", art: "assets/cards/Ball Control/Long Bomb.jpg", type: "pass" },
    { id: "Ball_Control_LookInPass", label: "Look In Pass", art: "assets/cards/Ball Control/Look In Pass.jpg", type: "pass" },
    { id: "Ball_Control_PopPass", label: "Pop Pass", art: "assets/cards/Ball Control/Pop Pass.jpg", type: "pass" },
    { id: "Ball_Control_PowerOffTackle", label: "Power Off Tackle", art: "assets/cards/Ball Control/Power Off Tackle.jpg", type: "run" },
    { id: "Ball_Control_PowerUpMiddle", label: "Power Up Middle", art: "assets/cards/Ball Control/Power Up Middle.jpg", type: "run" },
    { id: "Ball_Control_Punt4thDownOnly", label: "Punt (4th Down Only)", art: "assets/cards/Ball Control/Punt (4th Down Only).jpg", type: "punt" },
    { id: "Ball_Control_PuntAnyDown", label: "Punt (Any Down)", art: "assets/cards/Ball Control/Punt (Any Down).jpg", type: "punt" },
    { id: "Ball_Control_QBKeeper", label: "QB Keeper", art: "assets/cards/Ball Control/QB Keeper.jpg", type: "run" },
    { id: "Ball_Control_RazzleDazzle", label: "Razzle Dazzle", art: "assets/cards/Ball Control/Razzle Dazzle.jpg", type: "run" },
    { id: "Ball_Control_Reverse", label: "Reverse", art: "assets/cards/Ball Control/Reverse.jpg", type: "run" },
    { id: "Ball_Control_RunPassOption", label: "Run & Pass Option", art: "assets/cards/Ball Control/Run & Pass Option.jpg", type: "run" },
    { id: "Ball_Control_ScreenPass", label: "Screen Pass", art: "assets/cards/Ball Control/Screen Pass.jpg", type: "pass" },
    { id: "Ball_Control_SidelinePass", label: "Sideline Pass", art: "assets/cards/Ball Control/Sideline Pass.jpg", type: "pass" },
    { id: "Ball_Control_SlantRun", label: "Slant Run", art: "assets/cards/Ball Control/Slant Run.jpg", type: "run" },
    // Removed Stop & Go Pass and Trap to reduce deck to 20 cards
  ],
  "Aerial Style": [
    { id: "Aerial_Style_ButtonHookPass", label: "Button Hook Pass", art: "assets/cards/Aerial Style/Button Hook Pass.jpg", type: "pass" },
    { id: "Aerial_Style_DownInPass", label: "Down & In Pass", art: "assets/cards/Aerial Style/Down & In Pass.jpg", type: "pass" },
    { id: "Aerial_Style_DownOutPass", label: "Down & Out Pass", art: "assets/cards/Aerial Style/Down & Out Pass.jpg", type: "pass" },
    { id: "Aerial_Style_Draw", label: "Draw", art: "assets/cards/Aerial Style/Draw.jpg", type: "run" },
    { id: "Aerial_Style_EndRun", label: "End Run", art: "assets/cards/Aerial Style/End Run.jpg", type: "run" },
    { id: "Aerial_Style_FlairPass", label: "Flair Pass", art: "assets/cards/Aerial Style/Flair Pass.jpg", type: "pass" },
    { id: "Aerial_Style_LongBomb", label: "Long Bomb", art: "assets/cards/Aerial Style/Long Bomb.jpg", type: "pass" },
    { id: "Aerial_Style_LookInPass", label: "Look In Pass", art: "assets/cards/Aerial Style/Look In Pass.jpg", type: "pass" },
    { id: "Aerial_Style_PopPass", label: "Pop Pass", art: "assets/cards/Aerial Style/Pop Pass.jpg", type: "pass" },
    { id: "Aerial_Style_PowerOffTackle", label: "Power Off Tackle", art: "assets/cards/Aerial Style/Power Off Tackle.jpg", type: "run" },
    { id: "Aerial_Style_PowerUpMiddle", label: "Power Up Middle", art: "assets/cards/Aerial Style/Power Up Middle.jpg", type: "run" },
    { id: "Aerial_Style_Punt4thDownOnly", label: "Punt (4th Down Only)", art: "assets/cards/Aerial Style/Punt (4th Down Only).jpg", type: "punt" },
    { id: "Aerial_Style_PuntAnyDown", label: "Punt (Any Down)", art: "assets/cards/Aerial Style/Punt (Any Down).jpg", type: "punt" },
    { id: "Aerial_Style_QBKeeper", label: "QB Keeper", art: "assets/cards/Aerial Style/QB Keeper.jpg", type: "run" },
    { id: "Aerial_Style_RazzleDazzle", label: "Razzle Dazzle", art: "assets/cards/Aerial Style/Razzle Dazzle.jpg", type: "run" },
    { id: "Aerial_Style_Reverse", label: "Reverse", art: "assets/cards/Aerial Style/Reverse.jpg", type: "run" },
    { id: "Aerial_Style_RunPassOption", label: "Run & Pass Option", art: "assets/cards/Aerial Style/Run & Pass Option.jpg", type: "run" },
    { id: "Aerial_Style_ScreenPass", label: "Screen Pass", art: "assets/cards/Aerial Style/Screen Pass.jpg", type: "pass" },
    { id: "Aerial_Style_SidelinePass", label: "Sideline Pass", art: "assets/cards/Aerial Style/Sideline Pass.jpg", type: "pass" },
    { id: "Aerial_Style_SlantRun", label: "Slant Run", art: "assets/cards/Aerial Style/Slant Run.jpg", type: "run" },
    // Removed Stop & Go Pass and Trap to reduce deck to 20 cards
  ]
};

const DEFENSE_DECK = [
  { id: "Defense_GoalLine", label: "Goal Line", art: "assets/cards/Defense/Goal Line.jpg", type: "run" },
  { id: "Defense_InsideBlitz", label: "Inside Blitz", art: "assets/cards/Defense/Inside Blitz.jpg", type: "run" },
  { id: "Defense_OutsideBlitz", label: "Outside Blitz", art: "assets/cards/Defense/Outside Blitz.jpg", type: "run" },
  { id: "Defense_PassRun", label: "Pass & Run", art: "assets/cards/Defense/Pass & Run.jpg", type: "pass" },
  { id: "Defense_Passing", label: "Passing", art: "assets/cards/Defense/Passing.jpg", type: "pass" },
  { id: "Defense_PreventDeep", label: "Prevent Deep", art: "assets/cards/Defense/Prevent Deep.jpg", type: "pass" },
  { id: "Defense_Prevent", label: "Prevent", art: "assets/cards/Defense/Prevent.jpg", type: "pass" },
  { id: "Defense_RunPass", label: "Run & Pass", art: "assets/cards/Defense/Run & Pass.jpg", type: "balanced" },
  { id: "Defense_Running", label: "Running", art: "assets/cards/Defense/Running.jpg", type: "run" },
  { id: "Defense_ShortYardage", label: "Short Yardage", art: "assets/cards/Defense/Short Yardage.jpg", type: "run" }
];

// -----------------------------------------------------------------------------
// Offense chart outcome mappings
//
// These mappings define the exact yardage or special result for every
// offensive play against each defensive call. They are derived from the
// official Football Strategy charts supplied by the user in JSON format. The
// structure is OFFENSE_CHARTS[deckName][playName][letter] = resultString.
// The defensive letters A–J correspond to the digits printed on each
// defensive card: 1→A, 2→B, 3→C, 4→D, 5→E, 6→F, 7→G, 8→H, 9→I, 0→J.  These
// mappings are inlined here so the game can run fully offline without
// fetching external files.
// Replace the previously defined OFFENSE_CHARTS with a complete mapping of offensive
// play results against all ten defensive calls (A–J) derived from the official
// Football Strategy charts. This mapping was generated from the provided
// football_strategy_all_mappings.json file. Keys are the compact deck names
// used in the JSON (ProStyle, BallControl, AerialStyle). Each play maps to
// letter codes representing the defense call and yields a result string.
// These results include yardage, penalties, turnovers, sacks and long gains.
const OFFENSE_CHARTS = {};

// A full chart is provided separately as FULL_OFFENSE_CHARTS. Deck and play
// names are mapped via DECK_NAME_TO_CHART_KEY and LABEL_TO_CHART_KEY in
// determineOutcome().

const FULL_OFFENSE_CHARTS = {"ProStyle":{"Power Up Middle":{"A":"-2","B":"-1","C":"+10","D":"+1","E":"+1","F":"+2","G":"+3","H":"+7","I":"+9","J":"+10"},"Power Off Tackle":{"A":"-1","B":"FUMBLE","C":"-2","D":"+4","E":"+5","F":"+7","G":"+9","H":"-1","I":"+11","J":"+14"},"QB Keeper":{"A":"0","B":"-1","C":"+15","D":"+2","E":"+2","F":"+2","G":"PENALTY -5 (or -2)","H":"+15","I":"+5","J":"+5"},"Slant Run":{"A":"0","B":"+2","C":"-3","D":"+3","E":"+4","F":"PENALTY +5 (or +7)","G":"+8","H":"-3","I":"+13","J":"+18"},"End Run":{"A":"-4","B":"-1","C":"FUMBLE","D":"PENALTY +15","E":"-3","F":"+6","G":"+9 O/B","H":"+2","I":"+21 O/B","J":"+25 O/B"},"Reverse":{"A":"-2","B":"+1 O/B","C":"-4","D":"FUMBLE","E":"+7","F":"+10","G":"+13 O/B","H":"-6","I":"+20 O/B","J":"LG"},"Draw":{"A":"+1","B":"+2","C":"-2","D":"+2","E":"+10","F":"PENALTY -5 (or -2)","G":"+5","H":"-3","I":"+12","J":"+22"},"Trap":{"A":"+3","B":"-1","C":"+9","D":"+4","E":"+2","F":"0","G":"FUMBLE","H":"+15 O/B","I":"+9","J":"+11"},"Run/Pass Option":{"A":"PENALTY","B":"Complete +13 O/B","C":"+5 O/B","D":"Incomplete","E":"+20","F":"Incomplete","G":"INTERCEPT Def -25","H":"Complete +25","I":"+5","J":"Incomplete"},"Flair Pass":{"A":"Complete +3","B":"Complete +6","C":"Incomplete","D":"Complete +5 O/B","E":"Complete +3 O/B","F":"Complete +1","G":"Incomplete","H":"Complete -2","I":"Complete +17 O/B","J":"PENALTY +5"},"Side Line Pass":{"A":"Complete +14 O/B","B":"Incomplete","C":"INTERCEPT Def +7","D":"Complete +7 O/B","E":"Complete +5 O/B","F":"Complete +4 O/B","G":"Complete +3 O/B","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Look In Pass":{"A":"Complete +9","B":"Incomplete","C":"Complete +6","D":"Incomplete","E":"Incomplete","F":"Incomplete","G":"Complete +11","H":"Complete +6","I":"Complete +4","J":"PENALTY -10"},"Screen Pass":{"A":"Complete +18","B":"Complete +15","C":"Complete +9","D":"Complete +6","E":"Complete +4 O/B","F":"SACK -10","G":"Incomplete","H":"Complete +12","I":"Incomplete","J":"Incomplete"},"Pop Pass":{"A":"Complete +19","B":"Complete +16","C":"Complete +11","D":"Complete +8","E":"Incomplete","F":"Incomplete","G":"Complete +4","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Button Hook Pass":{"A":"Complete +16","B":"Complete +13","C":"Complete +8","D":"Incomplete","E":"Incomplete","F":"Complete +16","G":"Incomplete","H":"Complete +7","I":"Incomplete","J":"Incomplete"},"Razzle Dazzle":{"A":"LG","B":"LG","C":"-15","D":"+11 O/B","E":"PENALTY -10","F":"-20","G":"-15","H":"FUMBLE","I":"LG","J":"LG"},"Down & Out Pass":{"A":"Complete +50 O/B","B":"Complete +45 O/B","C":"Complete +35","D":"Complete +25","E":"Incomplete","F":"Complete +25","G":"Incomplete","H":"SACK -15","I":"INTERCEPT Def +20","J":"Incomplete"},"Down & In Pass":{"A":"Complete +45","B":"Complete +35","C":"SACK -5","D":"Complete +35","E":"Complete +30","F":"INTERCEPT Def -30","G":"Incomplete","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Long Bomb":{"A":"Complete LG","B":"Complete LG","C":"+3 O/B","D":"Complete +35 O/B","E":"SACK -15","F":"Incomplete","G":"Incomplete","H":"Incomplete","I":"PENALTY +30 1st Down","J":"INTERCEPT Def -30"},"Stop & Go Pass":{"A":"Complete +35","B":"Complete +30","C":"Incomplete","D":"Incomplete","E":"PENALTY -10 (or Incomplete)","F":"Incomplete","G":"Complete +35 O/B","H":"Complete +30 O/B","I":"Incomplete","J":"INTERCEPT Def -25"}},"BallControl":{"Power Up Middle":{"A":"-2","B":"-1","C":"+12","D":"+1","E":"+2","F":"+3","G":"+5","H":"+8","I":"+10","J":"+11"},"Power Off Tackle":{"A":"-1","B":"FUMBLE","C":"-2","D":"+3","E":"+6","F":"+8","G":"+10","H":"-1","I":"+13","J":"+16"},"QB Keeper":{"A":"0","B":"-1","C":"+15","D":"+2","E":"+2","F":"+2","G":"PENALTY -5 (or -2)","H":"+15","I":"+5","J":"+5"},"Slant Run":{"A":"0","B":"+2","C":"-3","D":"+3","E":"+5","F":"PENALTY +5 (or +7)","G":"+9","H":"-3","I":"+15","J":"+20 O/B"},"End Run":{"A":"-3","B":"0","C":"-4","D":"+16","E":"-2","F":"+7","G":"+10 O/B","H":"+3","I":"+25 O/B","J":"+30 O/B"},"Reverse":{"A":"-1","B":"+1 O/B","C":"-3","D":"FUMBLE","E":"+7","F":"+10","G":"+13 O/B","H":"-5","I":"+20 O/B","J":"LG"},"Draw":{"A":"+1","B":"+2","C":"-2","D":"+2","E":"+9","F":"PENALTY -5 (or -2)","G":"+5","H":"-3","I":"+12","J":"+22"},"Trap":{"A":"+3","B":"-1","C":"+9","D":"+4","E":"+2","F":"0","G":"PENALTY -10","H":"+15","I":"+9","J":"+11"},"Run/Pass Option":{"A":"PENALTY -15","B":"Complete +13 O/B","C":"+5 O/B","D":"Incomplete","E":"+20","F":"Incomplete","G":"INTERCEPT Def -25","H":"Complete +25","I":"+5","J":"Incomplete"},"Flair Pass":{"A":"Complete +3","B":"Complete +6","C":"Incomplete","D":"Complete +5 O/B","E":"Complete +3 O/B","F":"Complete +1","G":"Incomplete","H":"Complete -2","I":"Complete +17 O/B","J":"PENALTY +5"},"Side Line Pass":{"A":"Complete +12 O/B","B":"Incomplete","C":"INTERCEPT Def +7","D":"Complete +6 O/B","E":"Complete +4 O/B","F":"Complete +3 O/B","G":"Complete +2 O/B","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Look In Pass":{"A":"Complete +9","B":"Incomplete","C":"Complete +6","D":"Incomplete","E":"Incomplete","F":"Incomplete","G":"Complete +11","H":"Complete +6","I":"Complete +4","J":"PENALTY -15"},"Screen Pass":{"A":"Complete +18","B":"Complete +15","C":"Complete +9","D":"Complete +6","E":"Incomplete","F":"SACK -10","G":"Incomplete","H":"Complete +12","I":"Incomplete","J":"Incomplete"},"Pop Pass":{"A":"Complete +16","B":"Complete +13","C":"Complete +8","D":"Complete +5","E":"Incomplete","F":"Incomplete","G":"Complete +4","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Button Hook Pass":{"A":"Complete +14","B":"Complete +11","C":"Complete +7","D":"Incomplete","E":"Incomplete","F":"Complete +14","G":"Incomplete","H":"PENALTY +5","I":"Incomplete","J":"SACK -5"},"Razzle Dazzle":{"A":"LG","B":"LG","C":"INTERCEPT Def +0","D":"+11 O/B","E":"PENALTY -15","F":"-20","G":"-15","H":"FUMBLE","I":"LG","J":"LG"},"Down & Out Pass":{"A":"Complete +50 O/B","B":"Complete +45 O/B","C":"Complete +35","D":"Incomplete","E":"Incomplete","F":"Complete +25","G":"Incomplete","H":"SACK -15 O/B","I":"INTERCEPT Def +20","J":"Incomplete"},"Down & In Pass":{"A":"Complete +45","B":"Incomplete","C":"SACK -5","D":"Complete +35","E":"Complete +30","F":"INTERCEPT Def -30","G":"Incomplete","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Long Bomb":{"A":"Complete LG","B":"Complete LG","C":"Incomplete","D":"PENALTY +30 1st Down","E":"SACK -15","F":"Incomplete","G":"Incomplete","H":"Incomplete","I":"PENALTY +25 1st Down","J":"INTERCEPT Def -20"},"Stop & Go Pass":{"A":"Complete +35","B":"Complete +30","C":"Incomplete","D":"Incomplete","E":"PENALTY -15","F":"Incomplete","G":"Complete +30 O/B","H":"Complete +25 O/B","I":"Incomplete","J":"INTERCEPT Def -20"}},"AerialStyle":{"Power Up Middle":{"A":"-2","B":"-1","C":"+8","D":"0","E":"+1","F":"+1","G":"+2","H":"+6","I":"+7","J":"+8"},"Power Off Tackle":{"A":"-1","B":"FUMBLE","C":"-2","D":"+2","E":"+3","F":"+5","G":"+7","H":"-1","I":"+9","J":"+12"},"QB Keeper":{"A":"0","B":"-1","C":"+12 O/B","D":"+1","E":"+1","F":"+1","G":"PENALTY -5 (or -2)","H":"+12","I":"+3","J":"+3"},"Slant Run":{"A":"0","B":"+2","C":"-3","D":"+2","E":"+3","F":"PENALTY +5 (or +7)","G":"+6","H":"-3","I":"+11","J":"+16"},"End Run":{"A":"-5","B":"-2","C":"FUMBLE","D":"PENALTY +10","E":"-4","F":"+5","G":"+8 O/B","H":"+1","I":"+17 O/B","J":"+20 O/B"},"Reverse":{"A":"-3","B":"+1 O/B","C":"-5","D":"FUMBLE","E":"+7","F":"+10","G":"+13 O/B","H":"-7","I":"+20 O/B","J":"LG"},"Draw":{"A":"+1","B":"+2","C":"-2","D":"+2","E":"+10","F":"+1","G":"+5","H":"-3","I":"+12","J":"+22"},"Trap":{"A":"+3","B":"-1","C":"+11","D":"+7","E":"+5","F":"+2","G":"FUMBLE","H":"+18 O/B","I":"+11","J":"+14"},"Run/Pass Option":{"A":"FUMBLE","B":"Complete +15 O/B","C":"+4","D":"Incomplete","E":"+20","F":"Incomplete","G":"INTERCEPT Def -30","H":"Complete +30","I":"+4","J":"Incomplete"},"Flair Pass":{"A":"Complete +3","B":"Complete +6","C":"Incomplete","D":"Complete +5 O/B","E":"Complete +3 O/B","F":"Complete +1","G":"Incomplete","H":"Complete -2","I":"Complete +17 O/B","J":"PENALTY +5"},"Side Line Pass":{"A":"Complete +15 O/B","B":"Incomplete","C":"INTERCEPT Def +7","D":"Complete +8 O/B","E":"Complete +6 O/B","F":"Complete +5 O/B","G":"Complete +4 O/B","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Look In Pass":{"A":"Complete +9","B":"Incomplete","C":"Complete +6","D":"Complete +3","E":"Incomplete","F":"Incomplete","G":"Complete +11","H":"Complete +6","I":"Complete +4","J":"PENALTY -5"},"Screen Pass":{"A":"Complete +20","B":"Complete +17","C":"Complete +10","D":"Complete +6","E":"Complete +4 O/B","F":"SACK -10","G":"Incomplete","H":"Complete +14","I":"Incomplete","J":"Incomplete"},"Pop Pass":{"A":"Complete +19","B":"Complete +16","C":"Complete +11","D":"Complete +8","E":"Incomplete","F":"Incomplete","G":"Complete +4","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Button Hook Pass":{"A":"Complete +18","B":"Complete +15","C":"Complete +9","D":"Incomplete","E":"Incomplete","F":"Complete +18","G":"Incomplete","H":"Complete +8","I":"Incomplete","J":"SACK-5"},"Razzle Dazzle":{"A":"LG","B":"LG","C":"-15","D":"+11 O/B","E":"PENALTY -5","F":"-20","G":"-15","H":"FUMBLE","I":"LG","J":"LG"},"Down & Out Pass":{"A":"Complete +50 O/B","B":"Complete +45 O/B","C":"Complete +35","D":"Complete +25","E":"Incomplete","F":"Complete +25","G":"Incomplete","H":"PENALTY -10","I":"INTERCEPT Def +20","J":"Incomplete"},"Down & In Pass":{"A":"Complete +45","B":"Complete +35","C":"SACK -5","D":"Complete +35","E":"Complete +30","F":"INTERCEPT Def -30","G":"Incomplete","H":"Incomplete","I":"Incomplete","J":"Incomplete"},"Long Bomb":{"A":"Complete LG","B":"Complete LG","C":"+5 O/B","D":"Complete +35 O/B","E":"SACK -10","F":"Incomplete","G":"Incomplete","H":"Incomplete","I":"PENALTY +35 1st Down","J":"INTERCEPT Def -35"},"Stop & Go Pass":{"A":"Complete +35","B":"Complete +30","C":"Incomplete","D":"Incomplete","E":"PENALTY -5","F":"Incomplete","G":"Complete +35 O/B","H":"Complete +30 O/B","I":"Incomplete","J":"INTERCEPT Def -30"}}};

// Mapping of defensive card numbers to letter codes used in OFFENSE_CHARTS.
const DEF_NUM_TO_LETTER = {1:'A',2:'B',3:'C',4:'D',5:'E',6:'F',7:'G',8:'H',9:'I',0:'J'};

// Mapping of defensive card labels to their printed number on the actual
// defensive cards. This allows us to convert a defensive card into one of
// letters A–J.
const DEF_LABEL_TO_NUM = {
  'Goal Line': 1,
  'Short Yardage': 2,
  'Inside Blitz': 3,
  'Running': 4,
  'Run & Pass': 5,
  'Pass & Run': 6,
  'Passing': 7,
  'Outside Blitz': 8,
  'Prevent': 9,
  'Prevent Deep': 0
};

// Map human‑readable deck names (with spaces) to the compact keys used in the
// FULL_OFFENSE_CHARTS. Without this, "Pro Style" would not match the
// "ProStyle" key from the JSON, etc.
const DECK_NAME_TO_CHART_KEY = {
  'Pro Style': 'ProStyle',
  'Ball Control': 'BallControl',
  'Aerial Style': 'AerialStyle'
};

// Map certain offensive play labels to the corresponding keys in the
// FULL_OFFENSE_CHARTS. Some card names differ slightly from the JSON
// chart. For example, our deck uses "Run & Pass Option" but the chart
// uses "Run/Pass Option", and "Sideline Pass" vs "Side Line Pass".
const LABEL_TO_CHART_KEY = {
  'Run & Pass Option': 'Run/Pass Option',
  'Sideline Pass': 'Side Line Pass'
};

// Long gain table used when a result is "LG". Each entry corresponds to
// rolling a six‑sided die (1–6). Some entries include an additional 1D6
// multiplier as per the original charts. We interpret these entries to
// produce a total yardage.
const LONG_GAIN_TABLE = {1:'+50 and (+10 x 1D6)', 2:'+50', 3:'+45', 4:'+40', 5:'+35', 6:'+30'};

// -----------------------------------------------------------------------------
// Special teams and time keeping tables
//
// The Football Strategy charts include several additional lookup tables for
// kickoffs, onside kicks, place kicking and time management. We define
// constants to represent these tables in JavaScript. The NORMAL_KICKOFF_TABLE
// maps a 2D6 roll (sum of two six‑sided dice) to a kickoff result. Values
// less than 4 may include a trailing '*' to indicate that you must roll
// again to determine the yard line. Penalties and fumbles apply to the
// receiving team. The ONSIDE_KICK_TABLE maps a single die roll (with a
// possible +1 bonus) to whether the kicking team or receiving team recovers
// and at what yard line. The PLACE_KICK_TABLE encodes whether a place kick
// (extra point or field goal) is good ("G") or no good ("NG") based on a
// 2D6 roll and the distance to the goal line. Finally, TIME_KEEPING maps
// categories of play outcomes to the number of seconds to deduct from the
// game clock.

// Normal kickoff results. Keys are 2D6 totals, values are either numeric
// yard lines or strings indicating special results. A trailing '*' means
// roll again for the yard line. Fumbles result in the kicking team
// recovering; penalties subtract 10 yards from the return. Long gains (LG)
// use the long gain table.
const NORMAL_KICKOFF_TABLE = {
  2: 'FUMBLE*',
  3: 'PENALTY -10*',
  4: 10,
  5: 15,
  6: 20,
  7: 25,
  8: 30,
  9: 35,
  10: 40,
  11: 'LG',
  12: 'LG + 5'
};

// Onside kickoff results. Each entry indicates who recovers the ball and at
// which yard line relative to the receiving team's end zone. A +1 bonus is
// applied to the die roll if the kicking team is not trailing in the
// current score. This table is referenced only if an onside kick is
// attempted (not currently exposed in the UI).
const ONSIDE_KICK_TABLE = {
  1: { possession: 'kicker', yard: 40 },
  2: { possession: 'kicker', yard: 40 },
  3: { possession: 'receiver', yard: 35 },
  4: { possession: 'receiver', yard: 35 },
  5: { possession: 'receiver', yard: 35 },
  6: { possession: 'receiver', yard: 30 }
};

// Place kicking results. Keys are 2D6 totals; each value is an object
// mapping a distance category to 'G' (good) or 'NG' (no good). Distance
// categories correspond to PAT, 1‑12, 13‑22, 23‑32, 33‑38 and 39‑45 yards.
const PLACE_KICK_TABLE = {
  2: { PAT: 'NG', '1-12': 'NG', '13-22': 'NG', '23-32': 'G', '33-38': 'G', '39-45': 'G' },
  3: { PAT: 'G',  '1-12': 'NG', '13-22': 'NG', '23-32': 'NG', '33-38': 'G', '39-45': 'NG' },
  4: { PAT: 'G',  '1-12': 'G',  '13-22': 'NG', '23-32': 'NG', '33-38': 'NG', '39-45': 'NG' },
  5: { PAT: 'G',  '1-12': 'G',  '13-22': 'G',  '23-32': 'NG', '33-38': 'NG', '39-45': 'NG' },
  6: { PAT: 'G',  '1-12': 'G',  '13-22': 'G',  '23-32': 'G',  '33-38': 'NG', '39-45': 'NG' },
  7: { PAT: 'G',  '1-12': 'G',  '13-22': 'G',  '23-32': 'G',  '33-38': 'G',  '39-45': 'NG' },
  8: { PAT: 'G',  '1-12': 'G',  '13-22': 'G',  '23-32': 'G',  '33-38': 'NG', '39-45': 'NG' },
  9: { PAT: 'G',  '1-12': 'G',  '13-22': 'G',  '23-32': 'NG', '33-38': 'NG', '39-45': 'NG' },
  10: { PAT: 'G', '1-12': 'G',  '13-22': 'G',  '23-32': 'NG', '33-38': 'NG', '39-45': 'NG' },
  11: { PAT: 'G', '1-12': 'G',  '13-22': 'NG', '23-32': 'NG', '33-38': 'G',  '39-45': 'NG' },
  12: { PAT: 'NG','1-12': 'NG', '13-22': 'G',  '23-32': 'G',  '33-38': 'G',  '39-45': 'G' }
};

// Time keeping values in seconds for different categories of plays. These
// constants drive the game clock adjustments. See the official rules for
// details. In our implementation, 'gain0to20' is used for gains of 0–20
// yards in bounds, 'gain20plus' for gains of 20+ yards in bounds, 'loss'
// for plays that lose yardage, 'outOfBounds' for any result that goes out
// of bounds, 'incomplete' for incomplete passes, 'interception' for
// interceptions, 'penalty' for penalties, 'fumble' for fumbles,
// 'kickoff' for kickoffs, 'fieldgoal' for field goal attempts (in bounds),
// 'punt' for punts and 'extraPoint' for extra point kicks.  We do not
// currently model timeouts, so those rows are omitted.
const TIME_KEEPING = {
  gain0to20: 30,
  gain20plus: 45,
  loss: 30,
  outOfBounds: 15,
  incomplete: 15,
  interception: 30,
  penalty: 15,
  fumble: 15,
  kickoff: 15,
  fieldgoal: 15,
  punt: 15,
  extraPoint: 0
};

// Punt distance and return tables. Distances are gross punt yards (from LOS).
// After the ball is punted, if it doesn't become a touchback or go out of bounds,
// a return is resolved via PUNT_RETURN_TABLE (2D6). Some return results can be
// long gains (LG) or fumbles. Fumbles on returns have a 50% recovery chance for
// the kicking team resulting in a turnover at the spot.
const PUNT_DISTANCE_TABLE = {
  2: 30,
  3: 35,
  4: 38,
  5: 40,
  6: 42,
  7: 43,
  8: 44,
  9: 46,
  10: 48,
  11: 50,
  12: 52
};

const PUNT_RETURN_TABLE = {
  2: { type: 'LG' },            // explosive return
  3: { yards: 20 },
  4: { yards: 15 },
  5: { yards: 12 },
  6: { yards: 10 },
  7: { yards: 8 },
  8: { yards: 6 },
  9: { yards: 5 },
  10: { yards: 3 },
  11: { yards: 0 },             // no return
  12: { type: 'FC' }            // fair catch
};

/**
 * Parse a kickoff result and compute the yard line and turnover status.
 * The input 'res' is the value from NORMAL_KICKOFF_TABLE after resolving
 * any roll again markers. Returns an object with properties:
 *   yardLine (number) – the final yard line from the receiving team's goal
 *   turnover (boolean) – true if the kicking team recovers the ball
 * This helper is used by resolveKickoff() below.
 */
function parseKickoffYardLine(res) {
  let yardLine = 25;
  let turnover = false;
  if (typeof res === 'number') {
    yardLine = res;
  } else if (res === 'LG') {
    // Use long gain table for returns. Clamp to midfield (50) to prevent
    // unrealistic returns past the 50 yard line. We interpret long gain
    // results as return distance rather than starting from the 50.
    yardLine = Math.min(resolveLongGain(), 50);
  } else if (res === 'LG + 5') {
    yardLine = Math.min(resolveLongGain() + 5, 50);
  } else {
    // Should not occur; default to 25.
    yardLine = 25;
  }
  return { yardLine, turnover };
}

/**
 * Resolve a kickoff. If onside is true, use the onside kickoff table. For
 * normal kickoffs, roll 2D6 to look up the result in the normal table.
 * Handles fumbles and penalties by rolling again for the yard line and
 * applying turnover/penalty as appropriate. Does not adjust the game
 * clock; the caller is responsible for deducting TIME_KEEPING.kickoff. The
 * returned yardLine is always relative to the receiving team's goal line.
 *
 * @param {boolean} onside Whether this is an onside kick
 * @param {string} kickerTeam 'player' or 'ai' indicating who is kicking
 * @returns {{ yardLine: number, turnover: boolean }}
 */
function resolveKickoff(onside, kickerTeam) {
  if (onside) {
    // Onside kick: roll 1D6 and apply +1 if the kicking team is not trailing
    let roll = rollD6();
    // Determine if kicker is trailing. If their score is less than the
    // opponent's, they are trailing and do not receive the +1 bonus.
    const kickerScore = kickerTeam === 'player' ? game.score.player : game.score.ai;
    const otherScore = kickerTeam === 'player' ? game.score.ai : game.score.player;
    if (kickerScore >= otherScore) {
      roll = Math.min(6, roll + 1);
    }
    const entry = ONSIDE_KICK_TABLE[roll] || { possession: 'receiver', yard: 35 };
    // If the kicker recovers, turnover is true; otherwise false.
    return { yardLine: entry.yard, turnover: entry.possession === 'kicker' };
  }
  // Normal kickoff: roll 2D6 to determine result.
  let roll = rollD6() + rollD6();
  let entry = NORMAL_KICKOFF_TABLE[roll];
  let turnover = false;
  let penalty = false;
  // Handle results with '*' indicating roll again
  if (typeof entry === 'string' && entry.includes('*')) {
    // Fumble or penalty on kickoff. Remove the '*'.
    if (/FUMBLE/i.test(entry)) {
      turnover = true;
    }
    if (/PENALTY/i.test(entry)) {
      penalty = true;
    }
    // Remove the star and any trailing text
    entry = entry.replace('*', '').trim();
    // Roll again to get the yard line. If this roll also indicates a fumble
    // or penalty, we treat second fumbles as offsetting (no turnover) and
    // second penalties as offsetting (no net penalty).
    let reroll = rollD6() + rollD6();
    let res2 = NORMAL_KICKOFF_TABLE[reroll];
    if (typeof res2 === 'string' && res2.includes('*')) {
      if (/FUMBLE/i.test(res2)) {
        // Second fumble: offset turnover (receiving team retains)
        turnover = false;
      }
      if (/PENALTY/i.test(res2)) {
        // Second penalty: offset (no penalty)
        penalty = false;
      }
      // Strip star and use remainder for yard line determination
      res2 = res2.replace('*', '').trim();
    }
    entry = res2;
  }
  // Determine yard line and turnover
  const { yardLine } = parseKickoffYardLine(entry);
  // Apply penalty yardage if required. Penalties on LG results are marked
  // from the 50 yard line, but for simplicity we subtract 10 yards from
  // the return unless offset.
  let finalYard = yardLine;
  if (penalty) {
    finalYard = Math.max(0, yardLine - 10);
    log('Penalty on kickoff against receiving team: -10 yards');
  }
  return { yardLine: finalYard, turnover };
}

/**
 * Calculate the number of seconds to deduct from the game clock based on
 * the outcome of a play. Uses the TIME_KEEPING constants defined above.
 * If a play goes out of bounds, that always overrides other categories
 * and results in a 15 second deduction. Otherwise, the outcome category
 * (incomplete, interception, fumble, penalty, loss or gain) determines
 * the time. Gains are split into two categories: 0–20 yards inclusive
 * and 21+ yards. Unknown categories default to a 30 second deduction.
 *
 * @param {Object} outcome The parsed result object from parseResultString
 * @returns {number} Seconds to subtract from the game clock
 */
function calculateTimeOff(outcome) {
  if (!outcome) return TIME_KEEPING.gain0to20;
  // Out of bounds always takes precedence
  if (outcome.outOfBounds) return TIME_KEEPING.outOfBounds;
  switch (outcome.category) {
    case 'incomplete':
      return TIME_KEEPING.incomplete;
    case 'interception':
      return TIME_KEEPING.interception;
    case 'fumble':
      return TIME_KEEPING.fumble;
    case 'penalty':
      return TIME_KEEPING.penalty;
    case 'loss':
      return TIME_KEEPING.loss;
    case 'gain':
      // Use absolute yards in case negative yards slip through. Gains of
      // more than 20 yards take 45 seconds; shorter gains take 30.
      if (Math.abs(outcome.yards) > 20) {
        return TIME_KEEPING.gain20plus;
      }
      return TIME_KEEPING.gain0to20;
    default:
      // Unknown or other categories (including sacks not caught above)
      return TIME_KEEPING.gain0to20;
  }
}

// Roll a six‑sided die. Uses Math.random for unpredictability.
function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * Resolve a long gain based on the LONG_GAIN_TABLE. A roll of 1 triggers a
 * secondary 1D6 roll multiplied by 10 and added to 50. Other rolls return
 * the fixed yardage indicated. Returns an integer number of yards.
 */
function resolveLongGain() {
  const roll = rollD6();
  const entry = LONG_GAIN_TABLE[roll];
  if (!entry) return 30; // fallback
  if (entry.startsWith('+50 and')) {
    // remove prefix and parse 10 x 1D6
    const extra = rollD6() * 10;
    return 50 + extra;
  }
  // parse simple +NN
  const match = entry.match(/[+-]?\d+/);
  return match ? parseInt(match[0], 10) : 30;
}

/**
 * Parse a result string from the OFFENSE_CHARTS into an outcome object. The
 * outcome object contains properties describing yards gained/lost, penalties,
 * first down status and turnovers. This function handles the following
 * patterns:
 *   - Numeric gains or losses (e.g. "+10", "-3").
 *   - "Complete +NN" lines are treated as completed passes for that gain.
 *   - "Incomplete" results in 0 yards.
 *   - "FUMBLE" results in a turnover with no yardage gain.
 *   - "INTERCEPT Def -NN" results in a turnover and the new team gains
 *     |NN| yards from the spot of interception (we add this distance to
 *     the ball when flipping possession).
 *   - "PENALTY ±NN" applies a penalty; positive values are on the defense
 *     (benefiting the offense), negative values are on the offense.
 *   - If the penalty string includes "1st Down", the offense gets an
 *     automatic first down regardless of yards to go.
 *   - "Sack -NN" subtracts yardage like a run play.
 *   - "LG" triggers a long gain roll via resolveLongGain().
 * Unknown or unhandled strings default to 0 yards.
 */
function parseResultString(str) {
  const outcome = {
    yards: 0,
    penalty: null,
    turnover: false,
    interceptReturn: 0,
    firstDown: false
  };
  if (!str) return outcome;
  const s = str.trim();
  // Always record the raw result string for timekeeping
  outcome.raw = s;
  // Detect out of bounds indication (O/B) and mark it. This will be used
  // by the time keeping logic to determine a shorter clock run.
  outcome.outOfBounds = /O\/?B/i.test(s);
  // Incomplete pass
  if (/Incomplete/i.test(s)) {
    outcome.category = 'incomplete';
    return outcome;
  }
  // Fumble: turnover, 0 yards
  if (/FUMBLE/i.test(s)) {
    outcome.turnover = true;
    outcome.category = 'fumble';
    return outcome;
  }
  // Interception: turnover; extract return yardage if present (positive or negative)
  if (/INTERCEPT/i.test(s)) {
    outcome.turnover = true;
    outcome.category = 'interception';
    // extract the first signed integer (e.g., -25 or +20)
    const m = s.match(/[+-]?\d+/);
    if (m) {
      outcome.interceptReturn = parseInt(m[0], 10);
    }
    return outcome;
  }
  // Penalty: parse yardage and who it's on
  if (/PENALTY/i.test(s)) {
    const m = s.match(/[+-]\d+/);
    const yards = m ? parseInt(m[0], 10) : 0;
    const onDefense = yards > 0;
    outcome.penalty = {
      on: onDefense ? 'defense' : 'offense',
      yards: Math.abs(yards),
      firstDown: /1st\s*Down/i.test(s)
    };
    outcome.category = 'penalty';
    return outcome;
  }
  // Sack
  if (/Sack/i.test(s)) {
    const m = s.match(/-\d+/);
    if (m) {
      outcome.yards = parseInt(m[0], 10);
    }
    outcome.category = 'loss';
    return outcome;
  }
  // Long gain
  if (/LG/.test(s)) {
    outcome.yards = resolveLongGain();
    outcome.category = 'gain';
    return outcome;
  }
  // Complete +NN or simple numeric strings
  const numMatch = s.match(/[+-]?\d+/);
  if (numMatch) {
    outcome.yards = parseInt(numMatch[0], 10);
    outcome.category = outcome.yards < 0 ? 'loss' : 'gain';
    return outcome;
  }
  // Complete +NN pattern (should already match above) but catch just in case
  const completeMatch = s.match(/Complete\s*[+-]\d+/i);
  if (completeMatch) {
    const m2 = completeMatch[0].match(/[+-]\d+/);
    if (m2) outcome.yards = parseInt(m2[0], 10);
    outcome.category = outcome.yards < 0 ? 'loss' : 'gain';
    return outcome;
  }
  // Default category unknown
  outcome.category = 'other';
  return outcome;
}

// Build a lookup table of all cards by id for quick access.
const CARD_MAP = (() => {
  const map = {};
  for (const deckName of Object.keys(OFFENSE_DECKS)) {
    for (const card of OFFENSE_DECKS[deckName]) {
      map[card.id] = card;
    }
  }
  for (const card of DEFENSE_DECK) {
    map[card.id] = card;
  }
  return map;
})();

// -----------------------------------------------------------------------------
// Goal-line restriction ("white sign") metadata
// Certain offense cards have a circled-number restriction and cannot be used
// when the ball is between the defender's 1 and that number (inclusive).
// If metadata is not found in the external JSON, define a minimal mapping
// here keyed by offensive card id to the restricted distance (yards).
// Example: { 'Pro_Style_LongBomb': 5 } blocks use inside opponent 5.
const WHITE_SIGN_RESTRICTIONS = {
  // Add entries as needed if/when metadata becomes available
  // 'Pro_Style_LongBomb': 5,
  // 'Aerial_Style_LongBomb': 5,
  // 'Ball_Control_LongBomb': 5
};

function isRestrictedOffenseCard(card, distanceToOpponentGoal) {
  if (!card || (card.type !== 'run' && card.type !== 'pass')) return false;
  const limit = WHITE_SIGN_RESTRICTIONS[card.id];
  if (!limit) return false;
  // distanceToOpponentGoal is yards from line of scrimmage to opponent goal
  // For HOME offense (player), this is 100 - ballOn; for AWAY offense, ballOn.
  return distanceToOpponentGoal <= limit && distanceToOpponentGoal >= 1;
}

// ---------- RNG utilities ----------
// Linear congruential generator for reproducible randomness. Returns values
// in [0,1).
function createRNG(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffle(array, rng) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Format seconds into MM:SS.
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Normalize absolute ball position (0–100 from HOME goal) to a display yard
// line in the range 0–50 for logs, matching real-world convention where the
// midfield line (50) is neutral and yard lines never exceed 50.
function formatYardForLog(absBallOn) {
  const spot = absBallOn <= 50 ? absBallOn : 100 - absBallOn;
  return Math.round(spot);
}

// Convert an absolute yard value (0–100 from HOME goal) to a CSS percent
// within the playable field, accounting for 5% end zones on each side. The
// playable field spans 90% of the container width between 5% and 95%.
function yardToPercent(absYard) {
  return 5 + (absYard / 100) * 90;
}

// Convert field pixel coordinates to SVG (1000x500) coordinates
function fieldPxToSvgCoords(xPx, yPx) {
  const rect = fieldDisplay.getBoundingClientRect();
  const sx = (xPx / rect.width) * 1000;
  const sy = (yPx / rect.height) * 500;
  return { x: sx, y: sy };
}

// Convert absolute yard (0..100 from HOME goal) to SVG x (0..1000)
function yardToSvgX(absYard) {
  const percent = yardToPercent(absYard) / 100; // 0..1 across whole container
  return percent * 1000;
}

// Utilities to manage play art SVG
// Removed play-art SVG helpers and cleanup

// ---------------- Play Art JSON Loader ----------------
// Optional external tables (declared to avoid ReferenceError when undefined)
let PLACE_KICK_TABLE_DATA;
let KICKOFF_NORMAL_DATA;
let KICKOFF_ONSIDE_DATA;
let LONG_GAIN_DATA;
let TIME_KEEPING_DATA;
// Removed play-art dataset/index

// Removed play-art loaders

function buildPowerUpMiddleFallback() {
  return {
    id: 'O_PRO_POWER_UP_MIDDLE',
    play_art: {
      animation_blueprint: {
        entities: [
          { id: 'LT',  role: 'left_tackle',       start: { x: 0.35, y:  0.00 } },
          { id: 'LG',  role: 'left_guard',        start: { x: 0.43, y:  0.00 } },
          { id: 'C',   role: 'center',            start: { x: 0.50, y:  0.00 } },
          { id: 'RG',  role: 'right_guard',       start: { x: 0.57, y:  0.00 } },
          { id: 'RT',  role: 'right_tackle',      start: { x: 0.65, y:  0.00 } },
          { id: 'TE',  role: 'tight_end_right',   start: { x: 0.73, y:  0.00 } },
          { id: 'WRL', role: 'wide_receiver_left',  start: { x: 0.20, y:  0.00 } },
          { id: 'WRR', role: 'wide_receiver_right', start: { x: 0.85, y:  0.00 } },
          { id: 'QB',  role: 'quarterback',       start: { x: 0.50, y: -0.03 } },
          { id: 'FB',  role: 'fullback',          start: { x: 0.50, y: -0.07 } },
          { id: 'HB',  role: 'halfback',          start: { x: 0.50, y: -0.12 } }
        ],
        timeline: [
          { t: 0.28, actions: [ { type: 'handoff', from: 'QB', to: 'HB', handoff_point: { x: 0.50, y: -0.01 } } ] },
          { t: 0.30, actions: [
            { type: 'lead_insert', actor: 'FB', path: [ { x: 0.52, y: 0.01 }, { x: 0.52, y: 0.06 } ] },
            { type: 'follow', actor: 'HB', path: [ { x: 0.52, y: 0.00 }, { x: 0.52, y: 0.10 } ] }
          ]}
        ]
      }
    }
  };
}

// Removed play-art mapping helpers

// Minimal no-op data loader to satisfy startup call. Charts are embedded;
// external JSONs are optional and safely ignored if unavailable.
async function loadDataTables() {
  try {
    // Intentionally left minimal. If needed later, we can fetch:
    // - data/place_kicking.json -> PLACE_KICK_TABLE_DATA
    // - data/kickoff_normal.json -> KICKOFF_NORMAL_DATA
    // - data/kickoff_onside.json -> KICKOFF_ONSIDE_DATA
    // - data/long_gain.json -> LONG_GAIN_DATA
    // - data/time_keeping.json -> TIME_KEEPING_DATA
    // Current logic already falls back to embedded tables when *_DATA is undefined.
  } catch {}
}

// Check and announce the two-minute warning. According to the updated rules,
// the 2:00 mark in the 2nd and 4th quarters triggers an automatic time out.
// Any play that starts before the warning but would run past it stops with
// exactly 2:00 on the clock. After the warning the clock stops for
// out-of-bounds plays, incomplete passes and first downs until the next snap.
function checkTwoMinuteWarning() {
  // Only apply in the 2nd or 4th quarter of regulation. Ignore overtime.
  if (game.quarter === 2 || game.quarter === 4) {
    if (!game.twoMinuteWarningAnnounced && game.clock < 2 * 60) {
      // If a play would take the clock past 2:00, reset it to 2:00 and announce
      game.clock = 2 * 60;
      game.twoMinuteWarningAnnounced = true;
      game.inTwoMinute = true;
      log('Two-minute warning.');
    }
  }
}

// ---------- Game state ----------
const game = {
  seed: 42,
  rng: null,
  quarter: 1,
  clock: 15 * 60,
  down: 1,
  toGo: 10,
  ballOn: 25,
  possession: 'player', // 'player' or 'ai'
  score: { player: 0, ai: 0 },
  offenseDeck: 'Pro Style',
  aiOffenseDeck: 'Pro Style',
  playerHand: [],
  aiHand: [],
  awaitingPAT: false,
  awaitingFG: false,
  gameOver: false
  , overlayActive: false
  , twoMinuteWarningAnnounced: false
  , inTwoMinute: false
  , pendingUntimedDown: false
  , inUntimedDown: false
  , nextKickOnside: false
  , simulationMode: false
};

// ---------- UI elements ----------
const hudQuarter = document.getElementById('quarter');
const hudClock = document.getElementById('clock');
const hudDownDistance = document.getElementById('downDistance');
const hudBallSpot = document.getElementById('ballSpot');
const hudPossession = document.getElementById('possession');
const scoreDisplay = document.getElementById('score');
const logElement = document.getElementById('log');
const handElement = document.getElementById('hand');
const cardPreview = document.getElementById('card-preview');
// AI intent element is no longer used because we no longer display the AI's
// chosen play. The corresponding HTML element has been removed from
// index.html, so this constant is retained only for backward compatibility.
const aiIntentElement = document.getElementById('ai-intent');
const deckSelect = document.getElementById('deck-select');
// Dropdown for selecting the AI coach persona. Determines the AI's offensive deck.
const opponentSelect = document.getElementById('opponent-select');
// Coach personas and aggressiveness profiles
const COACH_PROFILES = {
  'Andy Reid': {
    name: 'Andy Reid',
    aggression: 0.9, // very aggressive
    fourthDownBoost: 0.15,
    passBias: 0.15,
    twoPointAggressiveLate: true,
    onsideAggressive: true
  },
  'John Madden': {
    name: 'John Madden',
    aggression: 0.6, // balanced-aggressive
    fourthDownBoost: 0.08,
    passBias: 0.05,
    twoPointAggressiveLate: false,
    onsideAggressive: false
  },
  'Bill Belichick': {
    name: 'Bill Belichick',
    aggression: 0.35, // conservative
    fourthDownBoost: 0.0,
    passBias: -0.05, // slight run bias situationally
    twoPointAggressiveLate: false,
    onsideAggressive: false
  }
};

function getCoachProfile() {
  const coach = game.aiCoach || (opponentSelect ? opponentSelect.value : 'John Madden');
  return COACH_PROFILES[coach] || COACH_PROFILES['John Madden'];
}
// Seed input removed from the UI. We no longer expose or use a seed; the RNG
// now defaults to Math.random for true randomness.  The corresponding
// HTML element has been removed, so this constant is unused.
// const seedInput = document.getElementById('seed-input');
// Attempt to locate the New Game button by either id. Some older versions of
// the HTML used the id "newgame" (no dash) while newer versions use
// "new-game". Query both so that clicking the button works regardless of
// which id is present. Without this, the New Game button may appear
// unresponsive if the id in the markup does not match the script.
const newGameButton = document.getElementById('new-game') || document.getElementById('newgame');
// The play zone element has been removed from the UI. We still keep a
// reference for legacy message display, but it may be null if the DOM
// does not include it.
const playZone = document.getElementById('play-zone');
const patOptions = document.getElementById('pat-options');
const fgOptions = document.getElementById('fg-options');
const btnKickPAT = document.getElementById('kick-pat');
const btnGoTwo = document.getElementById('go-two');
const btnKickFG = document.getElementById('kick-fg');

// DEV test setup controls
const testPlayerDeck = document.getElementById('test-player-deck');
const testAiDeck = document.getElementById('test-ai-deck');
const testPossession = document.getElementById('test-possession');
const testBallOn = document.getElementById('test-ballon');
const testDown = document.getElementById('test-down');
const testToGo = document.getElementById('test-togo');
const testQuarter = document.getElementById('test-quarter');
const testClock = document.getElementById('test-clock');

// DEV/TEST controls buttons
const startTestBtn = document.getElementById('start-test-game');
const runAutoBtn = document.getElementById('run-auto-game');

// Penalty decision modal elements (created dynamically)
let penaltyModal;
let penaltyAcceptBtn;
let penaltyDeclineBtn;

// Coin toss and other decision modals (created dynamically)
let tossModal;
let tossReceiveBtn;
let tossKickBtn;
let puntEZModal;
let puntEZReturnBtn;
let puntEZDownBtn;
let safetyModal;
let safetyKickoffBtn;
let safetyFreePuntBtn;

// Create an onside-kick toggle in the controls panel so the player can choose
// to attempt an onside on their next kickoff without modifying the HTML file.
let onsideToggle;
const controlsEl = document.getElementById('controls');
if (controlsEl) {
  const row = document.createElement('div');
  row.className = 'control-row';
  const label = document.createElement('label');
  label.textContent = 'Onside Next Kick:';
  label.setAttribute('for', 'onside-next');
  onsideToggle = document.createElement('input');
  onsideToggle.type = 'checkbox';
  onsideToggle.id = 'onside-next';
  onsideToggle.addEventListener('change', () => {
    game.nextKickOnside = !!onsideToggle.checked;
  });
  row.appendChild(label);
  row.appendChild(onsideToggle);
  controlsEl.appendChild(row);
}

// Field display elements
// The field display shows a stylised football field with yard markers. We
// dynamically create vertical yard lines and overlay lines (blue for the
// current line of scrimmage, yellow for the line to gain a first down).
const fieldDisplay = document.getElementById('field-display');
let scrimmageLineEl;
let firstDownLineEl;
// Red zone overlay element. This covers the last 20 yards near each end zone
// when the ball is within that region.
let redZoneEl;
// Chain marker element that indicates the first down target along the sideline.
let chainMarkerEl;
// SVG overlay for animated play art (legacy was removed). New animator module will attach its own SVG.
let GSAnimator = null;

/**
 * Initialise the field graphic by creating vertical yard lines and the
 * overlay elements. This function should be called once after the DOM
 * content has loaded. Yard lines are placed every 10% across the width of
 * the field (representing every 10 yards on a 50 yard display). The
 * overlay lines are appended but their positions are updated in updateHUD().
 */
function initField() {
  if (!fieldDisplay) return;
  // Create yard lines at each 10 yard interval (excluding the edges).
  for (let i = 1; i < 10; i++) {
    const line = document.createElement('div');
    line.className = 'yard-line';
    line.style.left = `${yardToPercent(i * 10)}%`;
    fieldDisplay.appendChild(line);
  }
  // Create scrimmage (blue) and first down (yellow) lines.
  scrimmageLineEl = document.createElement('div');
  scrimmageLineEl.className = 'scrimmage-line';
  fieldDisplay.appendChild(scrimmageLineEl);
  firstDownLineEl = document.createElement('div');
  firstDownLineEl.className = 'firstdown-line';
  fieldDisplay.appendChild(firstDownLineEl);

  // Add yard number labels every 10 yards. We want nine labels across the
  // width of the field (positions 10% to 90%). The value decreases after
  // midfield to mimic real field numbering (10,20,30,40,50,40,30,20,10).
  for (let i = 1; i <= 9; i++) {
    const value = i <= 5 ? i * 10 : (10 - i) * 10;
    const pos = i * 10;
    // Top label (upright)
    const topLabel = document.createElement('div');
    topLabel.className = 'yard-label-top';
    topLabel.textContent = value;
    topLabel.style.left = `${yardToPercent(pos)}%`;
    fieldDisplay.appendChild(topLabel);
    // Bottom label (upside down)
    const bottomLabel = document.createElement('div');
    bottomLabel.className = 'yard-label-bottom';
    bottomLabel.textContent = value;
    bottomLabel.style.left = `${yardToPercent(pos)}%`;
    fieldDisplay.appendChild(bottomLabel);
  }

  // Add hash marks for every yard across the full 100 yards. We create
  // markers at each yard from 1–99 (skip the end lines at 0 and 100).
  // Each yard corresponds to 1% of the field width. Every 5th yard is
  // thicker to improve legibility.
  for (let i = 1; i < 100; i++) {
    // Bottom hash mark
    const markBottom = document.createElement('div');
    markBottom.className = 'hash-mark';
    if (i % 5 === 0) markBottom.classList.add('five');
    markBottom.style.left = `${yardToPercent(i)}%`;
    fieldDisplay.appendChild(markBottom);
    // Top hash mark: duplicate with additional class for top alignment.
    const markTop = document.createElement('div');
    markTop.className = 'hash-mark top';
    if (i % 5 === 0) markTop.classList.add('five');
    markTop.style.left = `${yardToPercent(i)}%`;
    fieldDisplay.appendChild(markTop);
  }

  // Add painted end zones with simple text. Wrap the text in a span so we
  // can rotate it via CSS. Both labels have been flipped 180° from before:
  // HOME now 270°, VISITORS now 90°.
  const homeZone = document.createElement('div');
  homeZone.className = 'end-zone home';
  const homeSpan = document.createElement('span');
  homeSpan.className = 'end-zone-text';
  homeSpan.textContent = 'HOME';
  homeZone.appendChild(homeSpan);
  fieldDisplay.appendChild(homeZone);
  const visitorZone = document.createElement('div');
  visitorZone.className = 'end-zone visitor';
  const visitorSpan = document.createElement('span');
  visitorSpan.className = 'end-zone-text';
  visitorSpan.textContent = 'VISITORS';
  visitorZone.appendChild(visitorSpan);
  fieldDisplay.appendChild(visitorZone);
  // Add midfield logo. Use simple initials for the game name.
  const midLogo = document.createElement('div');
  midLogo.className = 'mid-logo';
  midLogo.textContent = 'GS';
  fieldDisplay.appendChild(midLogo);

  // Add red zone overlay. This element will be shown when the ball is
  // inside either 20‑yard zone. We assign it to redZoneEl so it can
  // be manipulated in updateHUD().
  redZoneEl = document.createElement('div');
  redZoneEl.className = 'red-zone';
  redZoneEl.style.display = 'none';
  redZoneEl.id = 'red-zone';
  fieldDisplay.appendChild(redZoneEl);

  // Add chain marker indicator. This element marks the first down line
  // along the bottom of the field. Its position is updated whenever
  // down & distance change. Initially hidden until a game starts.
  chainMarkerEl = document.createElement('div');
  chainMarkerEl.className = 'chain-marker';
  chainMarkerEl.style.display = 'none';
  chainMarkerEl.id = 'chain-marker';
  fieldDisplay.appendChild(chainMarkerEl);

  // Removed play-art overlay creation

  // Create a simple penalty decision modal attached to body
  if (!penaltyModal) {
    penaltyModal = document.createElement('div');
    penaltyModal.id = 'penalty-modal';
    penaltyModal.style.position = 'fixed';
    penaltyModal.style.left = '50%';
    penaltyModal.style.top = '50%';
    penaltyModal.style.transform = 'translate(-50%, -50%)';
    penaltyModal.style.background = '#0f2744';
    penaltyModal.style.border = '2px solid #ffeb3b';
    penaltyModal.style.borderRadius = '8px';
    penaltyModal.style.padding = '12px';
    penaltyModal.style.color = '#ffeb3b';
    penaltyModal.style.minWidth = '320px';
    penaltyModal.style.zIndex = '10000';
    penaltyModal.style.display = 'none';
    const text = document.createElement('div');
    text.id = 'penalty-text';
    text.style.whiteSpace = 'pre-line';
    text.style.marginBottom = '8px';
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';
    btnRow.style.justifyContent = 'flex-end';
    penaltyAcceptBtn = document.createElement('button');
    penaltyAcceptBtn.className = 'btn';
    penaltyAcceptBtn.textContent = 'Accept';
    penaltyDeclineBtn = document.createElement('button');
    penaltyDeclineBtn.className = 'btn';
    penaltyDeclineBtn.textContent = 'Decline';
    btnRow.appendChild(penaltyDeclineBtn);
    btnRow.appendChild(penaltyAcceptBtn);
    penaltyModal.appendChild(text);
    penaltyModal.appendChild(btnRow);
    document.body.appendChild(penaltyModal);
  }
  // Create coin toss / opening choice modal
  if (!tossModal) {
    tossModal = document.createElement('div');
    tossModal.id = 'toss-modal';
    tossModal.style.position = 'fixed';
    tossModal.style.left = '50%';
    tossModal.style.top = '50%';
    tossModal.style.transform = 'translate(-50%, -50%)';
    tossModal.style.background = '#0f2744';
    tossModal.style.border = '2px solid #ffeb3b';
    tossModal.style.borderRadius = '8px';
    tossModal.style.padding = '12px';
    tossModal.style.color = '#ffeb3b';
    tossModal.style.minWidth = '320px';
    tossModal.style.zIndex = '10000';
    tossModal.style.display = 'none';
    const text = document.createElement('div');
    text.id = 'toss-text';
    text.textContent = 'Opening choice: Receive or Kick?';
    text.style.marginBottom = '8px';
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.justifyContent = 'flex-end';
    tossReceiveBtn = document.createElement('button');
    tossReceiveBtn.className = 'btn';
    tossReceiveBtn.textContent = 'Receive';
    tossKickBtn = document.createElement('button');
    tossKickBtn.className = 'btn';
    tossKickBtn.textContent = 'Kick';
    row.appendChild(tossKickBtn);
    row.appendChild(tossReceiveBtn);
    tossModal.appendChild(text);
    tossModal.appendChild(row);
    document.body.appendChild(tossModal);
  }
  // Create punt-in-end-zone decision modal
  if (!puntEZModal) {
    puntEZModal = document.createElement('div');
    puntEZModal.id = 'punt-ez-modal';
    puntEZModal.style.position = 'fixed';
    puntEZModal.style.left = '50%';
    puntEZModal.style.top = '50%';
    puntEZModal.style.transform = 'translate(-50%, -50%)';
    puntEZModal.style.background = '#0f2744';
    puntEZModal.style.border = '2px solid #ffeb3b';
    puntEZModal.style.borderRadius = '8px';
    puntEZModal.style.padding = '12px';
    puntEZModal.style.color = '#ffeb3b';
    puntEZModal.style.minWidth = '360px';
    puntEZModal.style.zIndex = '10000';
    puntEZModal.style.display = 'none';
    const text = document.createElement('div');
    text.id = 'punt-ez-text';
    text.style.whiteSpace = 'pre-line';
    text.style.marginBottom = '8px';
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.justifyContent = 'flex-end';
    puntEZReturnBtn = document.createElement('button');
    puntEZReturnBtn.className = 'btn';
    puntEZReturnBtn.textContent = 'Return';
    puntEZDownBtn = document.createElement('button');
    puntEZDownBtn.className = 'btn';
    puntEZDownBtn.textContent = 'Down at 20';
    row.appendChild(puntEZDownBtn);
    row.appendChild(puntEZReturnBtn);
    puntEZModal.appendChild(text);
    puntEZModal.appendChild(row);
    document.body.appendChild(puntEZModal);
  }
  // Create safety free-kick choice modal
  if (!safetyModal) {
    safetyModal = document.createElement('div');
    safetyModal.id = 'safety-modal';
    safetyModal.style.position = 'fixed';
    safetyModal.style.left = '50%';
    safetyModal.style.top = '50%';
    safetyModal.style.transform = 'translate(-50%, -50%)';
    safetyModal.style.background = '#0f2744';
    safetyModal.style.border = '2px solid #ffeb3b';
    safetyModal.style.borderRadius = '8px';
    safetyModal.style.padding = '12px';
    safetyModal.style.color = '#ffeb3b';
    safetyModal.style.minWidth = '380px';
    safetyModal.style.zIndex = '10000';
    safetyModal.style.display = 'none';
    const text = document.createElement('div');
    text.id = 'safety-text';
    text.style.whiteSpace = 'pre-line';
    text.style.marginBottom = '8px';
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.justifyContent = 'flex-end';
    safetyKickoffBtn = document.createElement('button');
    safetyKickoffBtn.className = 'btn';
    safetyKickoffBtn.textContent = 'Safety Kickoff (+25)';
    safetyFreePuntBtn = document.createElement('button');
    safetyFreePuntBtn.className = 'btn';
    safetyFreePuntBtn.textContent = 'Free Kick Punt';
    row.appendChild(safetyFreePuntBtn);
    row.appendChild(safetyKickoffBtn);
    safetyModal.appendChild(text);
    safetyModal.appendChild(row);
    document.body.appendChild(safetyModal);
  }
}

// ---------- Event handlers ----------
// Start a new game.
if (newGameButton) {
  newGameButton.addEventListener('click', () => {
    startNewGame();
  });
}

// (Removed duplicate DEV MODE toggle wiring; see consolidated wiring near the bottom.)

// (DEV buttons are wired in the consolidated DEV MODE wiring block below.)

// Drag-and-drop has been replaced by click-to-play, so field drop listeners are removed.

// PAT options
btnKickPAT.addEventListener('click', () => {
  if (!game.awaitingPAT) return;
  attemptExtraPoint();
});
btnGoTwo.addEventListener('click', () => {
  if (!game.awaitingPAT) return;
  attemptTwoPoint();
});

// Field goal option
btnKickFG.addEventListener('click', () => {
  // Allow a field goal attempt whenever the button is visible and the game
  // isn't awaiting a PAT or over. We no longer depend on the awaitingFG
  // flag because the player may still choose to go for it on fourth down
  // instead of kicking. The fgOptions element is shown/hidden by
  // updateFGOptions() based on down and distance.
  if (game.awaitingPAT || game.gameOver) return;
  attemptFieldGoal();
});

// ---------- Game flow functions ----------
function startNewGame() {
  // Capture settings
  const deckName = deckSelect.value;
  // Determine AI offensive deck based on opponent selection. Each coach persona
  // uses a fixed deck: Andy Reid prefers Aerial Style, Bill Belichick favors
  // Ball Control, and John Madden runs Pro Style. If the dropdown is missing
  // for any reason, default to matching the player's deck.
  let aiDeck = deckName;
  if (opponentSelect) {
    const opponent = opponentSelect.value;
    if (opponent === 'Andy Reid') aiDeck = 'Aerial Style';
    else if (opponent === 'Bill Belichick') aiDeck = 'Ball Control';
    else if (opponent === 'John Madden') aiDeck = 'Pro Style';
    // Save coach persona for AI behavior tuning
    game.aiCoach = opponent;
  }
  game.offenseDeck = deckName;
  game.aiOffenseDeck = aiDeck;
  // The game uses Math.random for randomness. We no longer provide a seed input.
  game.rng = () => Math.random();
  game.quarter = 1;
  game.clock = 15 * 60;
  game.down = 1;
  game.toGo = 10;
  game.ballOn = 25;
  game.score.player = 0;
  game.score.ai = 0;
  game.possession = 'player';
  game.awaitingPAT = false;
  game.awaitingFG = false;
  game.gameOver = false;
  game.overlayActive = false;
  // Reset two-minute warning flags
  game.twoMinuteWarningAnnounced = false;
  game.inTwoMinute = false;
  logClear();
  log(`New game: deck=${deckName}`);
  // Coin toss and opening choice per rules: player chooses Receive or Kick.
  // Store opening/second-half preferences on game.
  game.openingChoice = null; // 'receive'|'kick'
  game.secondHalfReceiver = null; // 'player'|'ai'
  const showToss = () => {
    if (!tossModal) {
      // Fallback: default to receive
      game.openingChoice = 'receive';
      game.secondHalfReceiver = 'ai';
      game.possession = 'player';
      log('HOME chooses to receive the opening kickoff.');
      kickoff();
      updateHUD();
      dealHands();
      return;
    }
    // Auto-select in simulation mode
    if (game.simulationMode) {
      game.openingChoice = 'receive';
      game.secondHalfReceiver = 'ai';
      game.possession = 'player';
      log('Opening choice (auto): HOME receives.');
      kickoff();
      updateHUD();
      dealHands();
      return;
    }
    tossModal.style.display = 'block';
    tossReceiveBtn.onclick = () => {
      tossModal.style.display = 'none';
      game.openingChoice = 'receive';
      game.secondHalfReceiver = 'ai';
      game.possession = 'player';
      log('Opening choice: HOME receives. AWAY will receive to start the second half.');
      kickoff();
      updateHUD();
      dealHands();
    };
    tossKickBtn.onclick = () => {
      tossModal.style.display = 'none';
      game.openingChoice = 'kick';
      // Opponent chooses for second half per rule: if player kicks, opponent chooses; simple heuristic: opponent chooses receive in second half as well
      game.secondHalfReceiver = 'ai';
      game.possession = 'ai';
      log('Opening choice: HOME kicks. AWAY receives now and also chooses to receive to start the second half.');
      kickoff();
      updateHUD();
      dealHands();
    };
  };
  showToss();
}

function kickoff() {
  if (game.gameOver) return;
  // Resolve a kickoff according to the special teams table. The receiving
  // team is indicated by game.possession. The kicking team is the other
  // side. Normal kickoffs are used here; onside kicks would pass true.
  const kickerTeam = game.possession === 'player' ? 'ai' : 'player';
  // Determine if this kickoff is onside. Player can force via toggle; AI uses heuristic.
  let onside = false;
  if (kickerTeam === 'player') {
    onside = !!game.nextKickOnside;
    game.nextKickOnside = false; // reset after use
  } else {
    onside = shouldAttemptOnside('ai');
  }
  const result = resolveKickoff(onside, kickerTeam);
  const yard = result.yardLine;
  // Determine ball placement. If there was no turnover, the receiving
  // team retains possession. The yard line returned is relative to the
  // receiving team's goal line. Convert to our ballOn coordinate.
  if (!result.turnover) {
    if (game.possession === 'player') {
      game.ballOn = yard;
      log(`Kickoff return to the ${formatYardForLog(yard)} yard line. HOME takes over.`);
    } else {
      game.ballOn = 100 - yard;
      log(`Kickoff return to the ${formatYardForLog(yard)} yard line. AWAY takes over.`);
    }
  } else {
    // Fumble on kickoff: the kicking team recovers. Assign possession
    // to the kicking team and position the ball accordingly. For the
    // player kicking, the yard line is measured from the AI goal line and
    // must be converted to our coordinate. For the AI kicking, the yard
    // line is measured from the player's goal line.
    if (kickerTeam === 'player') {
      game.possession = 'player';
      game.ballOn = 100 - yard;
    } else {
      game.possession = 'ai';
      game.ballOn = yard;
    }
    const recoveringTeam = game.possession === 'player' ? 'HOME' : 'AWAY';
    log(`Kickoff fumble! ${recoveringTeam} recover at the ${formatYardForLog(yard)} yard line.`);
  }
  // Reset down and distance after kickoff
  game.down = 1;
  game.toGo = 10;
  // Deduct time for the kickoff (15 seconds)
  game.clock -= TIME_KEEPING.kickoff;
  // Check for two-minute warning and handle clock/quarter transitions
  checkTwoMinuteWarning();
  handleClockAndQuarter();
}

// Simple onside heuristic for AI: attempt in Q4 when trailing by <= 8 with <= 5:00 remaining
function shouldAttemptOnside(kicker) {
  // Expanded heuristic:
  // - Only in Q4
  // - Strongly consider onside at <= 3:00 when trailing by 4-8
  // - Consider at <= 5:00 when trailing by 1-3 if defense is weak to burns (approximate by high scoring game)
  if (game.quarter !== 4) return false;
  const myScore = kicker === 'player' ? game.score.player : game.score.ai;
  const oppScore = kicker === 'player' ? game.score.ai : game.score.player;
  const diff = oppScore - myScore; // positive if trailing
  const t = game.clock;
  const coach = kicker === 'ai' ? getCoachProfile() : COACH_PROFILES['John Madden'];
  // Must be trailing and within one possession (<= 8)
  if (diff <= 0 || diff > 8) return false;
  // Trailing by 4-8 with <= 3:00: go onside
  if (diff >= 4 && t <= 180) return true;
  // Trailing by 1-3 with <= 2:00: sometimes go onside depending on game pace
  if (diff <= 3 && t <= 120) {
    const highScoring = (game.score.player + game.score.ai) >= 40;
    const baseProb = 0.35 + (coach.onsideAggressive ? 0.25 : 0);
    return highScoring || Math.random() < baseProb;
  }
  // Default late window (<= 5:00) matches previous heuristic
  if (coach.onsideAggressive && t <= 300 && diff >= 4) return true;
  return t <= 300 && diff >= 6; // otherwise be more selective
}

function dealHands() {
  // Deal full hands rather than random subsets. The player always has access
  // to every offensive card (20) or every defensive card (10) depending on
  // possession. Likewise the AI selects from its full deck each play. No
  // shuffling or seeding is performed here.
  if (game.possession === 'player') {
    // Player on offense: show all offensive cards; AI on defense
    game.playerHand = OFFENSE_DECKS[game.offenseDeck].map((card) => card.id);
    game.aiHand = DEFENSE_DECK.map((card) => card.id);
  } else {
    // Player on defense: show all defensive cards; AI on offense
    game.playerHand = DEFENSE_DECK.map((card) => card.id);
    game.aiHand = OFFENSE_DECKS[game.aiOffenseDeck].map((card) => card.id);
  }
  renderHand();
  updateFGOptions();
}

function drawCards(deckArray, count) {
  // Shuffle and take the top count cards
  const shuffled = shuffle(deckArray, game.rng);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function renderHand() {
  handElement.innerHTML = '';
  const cardsToRender = game.playerHand;
  for (const cardId of cardsToRender) {
    const card = typeof cardId === 'string' ? CARD_MAP[cardId] : CARD_MAP[cardId.id];
    const div = document.createElement('div');
    div.className = 'card';
    // Dragging disabled; click-to-play instead
    div.draggable = false;
    div.dataset.id = card.id;
    div.innerHTML = `<img src="${card.art}" alt="${card.label}"><div class="label">${card.label}</div>`;
    // Fallback: if the image fails to load (missing or misnamed asset),
    // remove the <img> element and mark the card so that CSS can display
    // a placeholder background. Without this, missing images will leave
    // blank white cards without labels.
    const imgEl = div.querySelector('img');
    if (imgEl) {
      imgEl.onerror = () => {
        imgEl.remove();
        div.classList.add('no-image');
      };
    }
    // Click to play the selected card
    div.addEventListener('click', () => {
      // Use centre-bottom default for overlay positioning, though overlays are disabled below
      playCard(card.id);
    });
    // Show a large fixed-position preview overlay on hover so it sits
    // above all UI and is never clipped by container overflow.
    div.addEventListener('mouseenter', () => {
      if (!cardPreview || game.overlayActive || game.gameOver) return;
      cardPreview.style.backgroundImage = `url('${card.art}')`;
      cardPreview.innerHTML = `<div class='label'>${card.label}</div>`;
      cardPreview.style.display = 'block';
      cardPreview.style.zIndex = '9999';
      cardPreview.style.pointerEvents = 'none';
    });
    div.addEventListener('mouseleave', () => {
      if (cardPreview) {
        cardPreview.style.display = 'none';
        cardPreview.innerHTML = '';
      }
    });
    handElement.appendChild(div);
  }
}

// Update FG option visibility based on current situation
function updateFGOptions() {
  if (game.possession === 'player' && !game.awaitingPAT && !game.gameOver) {
    // Show field goal button only on 4th down and when within kicking range (inside 35 yards of goal)
    const distanceToGoal = 100 - game.ballOn;
    if (game.down === 4 && distanceToGoal <= 35) {
      fgOptions.classList.remove('hidden');
    } else {
      fgOptions.classList.add('hidden');
    }
  } else {
    fgOptions.classList.add('hidden');
  }
  // We no longer set awaitingFG here; the player may still choose to go for it on 4th down.
  game.awaitingFG = false;
}

function playCard(cardId, dropX, dropY) {
  // Do not allow play when awaiting PAT, when overlay cards are visible,
  // or when the game has ended. We no longer block plays when a field
  // goal option is visible; the player may choose to go for it on 4th down.
  if (game.awaitingPAT || game.overlayActive || game.gameOver) return;
  if (window.debug && window.debug.enabled) window.debug.event('ui', { action: 'play', cardId, dropX, dropY });
  const playerCard = CARD_MAP[cardId];
  // Validate punt restrictions: only allow 4th down punts when labeled 4th down only
  if (playerCard.type === 'punt') {
    if (game.possession === 'player' && playerCard.label.includes('4th Down Only') && game.down !== 4) {
      log('This punt card can only be used on 4th down.');
      return;
    }
    if (game.possession === 'ai' && playerCard.label.includes('4th Down Only') && game.down !== 4) {
      log('AI attempted a 4th-down-only punt on a non-4th down. Play selection invalid.');
      return;
    }
  }
  // Enforce goal-line "white sign" restriction: some offense cards cannot be used
  // when within a circled-number distance of the defender's goal line.
  if (game.possession === 'player' && isRestrictedOffenseCard(playerCard, game.ballOn)) {
    log('This play is restricted near the goal line and cannot be used here.');
    return;
  }
  if (game.possession === 'ai' && isRestrictedOffenseCard(playerCard, 100 - game.ballOn)) {
    // AI offense uses absolute distance to HOME goal mirrored
    log('AI attempted a restricted play near the goal line. Re-selecting.');
    // Simple fallback: choose a different non-restricted offensive card of same type if possible
    const deck = OFFENSE_DECKS[game.aiOffenseDeck];
    const alternatives = deck.filter((c) => c.type === playerCard.type && !isRestrictedOffenseCard(c, 100 - game.ballOn));
    const aiAlt = alternatives[0] || deck.find((c) => c.type !== 'punt') || deck[0];
    // Proceed with alternative by swapping playerCard variable for AI offense path
    if (game.possession === 'ai') {
      // In AI offense, the "playerCard" variable holds AI's offense
      playerCard = aiAlt;
    }
  }
  // AI chooses its card or special action
  const aiCard = aiChooseCard();
  // If the AI decides to attempt a field goal, handle that separately. A
  // successful or missed field goal triggers a change of possession via
  // attemptFieldGoal(). The player's defensive card is ignored in this
  // scenario.
  if (game.possession === 'ai' && aiCard && aiCard.type === 'field-goal') {
    attemptFieldGoal();
    return;
  }
  // If a JSON-driven animation exists for this card, skip the overlay cards so
  // the animation can start immediately and clearly.
  // Disable overlay reveal so cards do not appear on the field during resolution.
  // const hasJsonAnim = !!getPlayArtForCard(playerCard);
  // if (!hasJsonAnim) {
  //   showCardOverlay(playerCard, aiCard, dropX, dropY, () => {});
  // }
  // Resolve the play between the player and AI cards. We no longer remove
  // cards from the hands; the player and AI always have access to their
  // full decks each play. After resolution, a new hand will be dealt.
  resolvePlay(playerCard, aiCard);
  // Deal new hands for the next play unless PAT or the game has ended.
  if (!game.awaitingPAT && !game.gameOver) {
    dealHands();
  }
}

function aiChooseCard() {
  // Enhanced heuristics for AI play selection. Consider down, distance,
  // field position, score context and clock.
  // A lightweight context helper for clarity.
  function getAIContext() {
    const aiOnOffense = game.possession === 'ai';
    const aiScore = game.score.ai;
    const oppScore = game.score.player;
    const scoreDiff = oppScore - aiScore; // positive: AI trailing
    const quarter = game.quarter;
    const clock = game.clock; // seconds remaining in quarter
    const isLate = quarter === 4 && clock <= 5 * 60;
    const twoMinute = quarter === 4 && clock <= 120;
    // Distance to opponent goal for current offense
    // Player offense drives toward 100; AI offense drives toward 0.
    const offenseDistanceToGoal = game.possession === 'player' ? (100 - game.ballOn) : game.ballOn;
    const inRedZone = offenseDistanceToGoal <= 20;
    return { aiOnOffense, scoreDiff, quarter, clock, isLate, twoMinute, offenseDistanceToGoal, inRedZone };
  }

  const ctx = getAIContext();
  const coach = getCoachProfile();
  if (window.debug && window.debug.enabled) window.debug.event('ai', { action: 'choose_card_ctx', ctx });
  if (game.possession === 'player') {
    // AI is on defense.
    // Baseline by distance to go
    let preferred = 'balanced';
    if (game.toGo <= 2) preferred = 'run';
    else if (game.toGo >= 8 || game.down >= 3) preferred = 'pass';
    // Red zone tendency: expect more runs inside the 5, otherwise more pass 3rd/4th and long
    const offenseDistToGoal = 100 - game.ballOn; // player drives toward 100
    if (offenseDistToGoal <= 5 && game.toGo <= 3) preferred = 'run';
    if (offenseDistToGoal <= 20 && (game.down >= 3 || game.toGo >= 8)) preferred = 'pass';
    // Clock/score adjustments: trailing opponent late tends to pass; leading opponent late tends to run
    const playerLeads = game.score.player > game.score.ai;
    if (ctx.isLate) {
      if (playerLeads) preferred = preferred === 'run' ? 'run' : 'balanced';
      else preferred = 'pass';
    }
    // Coach pass/run bias: Reid leans pass, Belichick leans run when balanced
    if (preferred === 'balanced') {
      if (coach.passBias > 0 && Math.random() < coach.passBias) preferred = 'pass';
      if (coach.passBias < 0 && Math.random() < Math.abs(coach.passBias)) preferred = 'run';
    }
    let choices = DEFENSE_DECK.filter((card) => card.type === preferred);
    if (choices.length === 0) choices = DEFENSE_DECK;
    return choices[Math.floor(Math.random() * choices.length)];
  } else {
    // AI is on offense.
    // Fourth down decision-making
    if (game.down === 4) {
      const fgDistance = game.ballOn; // distance to player's goal for AI offense
      const inFGRange = fgDistance <= 45;
      const safePuntTerritory = fgDistance > 55; // deeper in own territory
      if (game.toGo > 1) {
        if (inFGRange) return { type: 'field-goal' };
        // Late and trailing: be more aggressive on 4th-and-medium
        const goBoost = coach.fourthDownBoost || 0;
        const mediumGo = ctx.isLate && ctx.scoreDiff > 0 && game.toGo <= (5 + Math.round(goBoost * 10));
        if (mediumGo) {
          const passes = OFFENSE_DECKS[game.aiOffenseDeck].filter((c) => c.type === 'pass');
          if (passes.length) return passes[Math.floor(Math.random() * passes.length)];
        }
        // Otherwise, punt if available
        const punts = OFFENSE_DECKS[game.aiOffenseDeck].filter((c) => c.type === 'punt');
        // Aggressive coaches may still go for it near midfield instead of punting
        const midfield = fgDistance >= 45 && fgDistance <= 65;
        if (punts.length && safePuntTerritory && !(coach.aggression > 0.8 && midfield && game.toGo <= 4)) return punts[0];
      } else {
        // Fourth-and-short: go for it. Prefer run unless long yardage situation by down/time
        if (game.toGo <= 1) {
          const runs = OFFENSE_DECKS[game.aiOffenseDeck].filter((c) => c.type === 'run');
          if (runs.length) return runs[Math.floor(Math.random() * runs.length)];
        }
        const passes = OFFENSE_DECKS[game.aiOffenseDeck].filter((c) => c.type === 'pass');
        if (passes.length) return passes[Math.floor(Math.random() * passes.length)];
      }
    }
    // Non‑fourth: choose tendency by distance and context
    const avoidRestricted = (card) => {
      if (card.type === 'punt' && card.label && card.label.includes('4th Down Only') && game.down !== 4) return false;
      if (isRestrictedOffenseCard(card, 100 - game.ballOn)) return false;
      return true;
    };
    // Base preference
    let prefer = 'balanced';
    if (game.toGo <= 3) prefer = 'run';
    else if (game.toGo >= 8 || game.down >= 3) prefer = 'pass';
    // Red zone tweaks
    if (ctx.inRedZone && game.toGo <= 3) prefer = 'run';
    if (ctx.inRedZone && (game.down >= 3 || game.toGo >= 8)) prefer = 'pass';
    // Clock/score: leading late -> bleed clock; trailing late -> push the ball
    if (ctx.isLate) {
      if (ctx.scoreDiff > 0) prefer = 'pass';
      else if (ctx.scoreDiff < 0) prefer = prefer === 'pass' ? 'pass' : 'run';
    }
    // Coach pass/run bias for balanced/close calls
    if (prefer === 'balanced') {
      if (coach.passBias > 0 && Math.random() < coach.passBias) prefer = 'pass';
      if (coach.passBias < 0 && Math.random() < Math.abs(coach.passBias)) prefer = 'run';
    }
    // Select by preference
    if (prefer !== 'pass') {
      const runs = OFFENSE_DECKS[game.aiOffenseDeck].filter((c) => c.type === 'run' && avoidRestricted(c));
      if (runs.length && (prefer === 'run' || Math.random() < 0.5)) return runs[Math.floor(Math.random() * runs.length)];
    }
    const passes = OFFENSE_DECKS[game.aiOffenseDeck].filter((c) => c.type === 'pass' && avoidRestricted(c));
    if (passes.length) return passes[Math.floor(Math.random() * passes.length)];
    const fallback = OFFENSE_DECKS[game.aiOffenseDeck].find(avoidRestricted) || OFFENSE_DECKS[game.aiOffenseDeck][0];
    if (window.debug && window.debug.enabled) window.debug.event('ai', { action: 'choose_card', choice: fallback ? fallback.label : '(none)' });
    return fallback;
  }
}

function resolvePlay(playerCard, aiCard) {
  // Determine which card is offense and which is defense based on possession
  let offenseCard, defenseCard;
  if (window.debug && window.debug.enabled) window.debug.event('engine', { action: 'resolve_play', offense: (game.possession==='player'?'HOME':'AWAY'), playerCard: playerCard && playerCard.label, aiCard: aiCard && aiCard.label });
  if (game.possession === 'player') {
    offenseCard = playerCard;
    defenseCard = aiCard;
  } else {
    offenseCard = aiCard;
    defenseCard = playerCard;
  }
  // Capture down & distance before the play for the log. Insert a blank
  // line to separate plays in the log for readability. Construct a
  // radio‑style call that includes down, distance, team and spot on the
  // field. Do not expose the card names – this should read like a
  // broadcast rather than a game engine debug statement.
  log('');
  const downNames = ['1st', '2nd', '3rd', '4th'];
  const downStr = downNames[Math.min(game.down, 4) - 1] || `${game.down}th`;
  const toGoStr = game.toGo;
  const teamName = game.possession === 'player' ? 'HOME' : 'AWAY';
  const yardLine = formatYardForLog(game.ballOn);
  // Track the first down target as an absolute yard to allow accurate
  // distance recalculation after penalties.
  const prevFirstDownAbs = game.possession === 'player'
    ? Math.max(0, Math.min(100, game.ballOn + game.toGo))
    : Math.max(0, Math.min(100, game.ballOn - game.toGo));
  log(`${downStr} & ${toGoStr}, ${teamName} ball at the ${yardLine} yard line.`);
  // Provide a simple formation descriptor based on the card type. This
  // helps set the scene: shotgun for most passes, under centre for
  // standard runs, heavy set for short yardage or trick plays.
  const formation = getFormationDescription(offenseCard);
  if (formation) {
    log(`${teamName} lines up ${formation}.`);
  }
  // Describe the initial quarterback action before the result is known.
  const playActionDesc = describePlayAction(offenseCard);
  if (playActionDesc) {
    log(`Quarterback ${playActionDesc}.`);
  }
  // Handle punts separately. If the offense card is a punt, resolve and return.
  if (offenseCard.type === 'punt') {
    resolvePunt();
    return;
  }
  const outcome = determineOutcome(offenseCard, defenseCard);
  try {
    // Start visual animation (non-blocking)
    if (GSAnimator) {
      const offensePlayId = mapCardIdToAnimId(offenseCard && offenseCard.id);
      const defenseName = defenseCard && (defenseCard.label || defenseCard.id || defenseCard.type);
      GSAnimator.animatePlay({
        offensePlayId,
        defenseCard: defenseName,
        ballOnYard: game.ballOn,
        yardsToGo: game.toGo,
        down: game.down,
        seed: Math.floor(Math.random() * 1e9),
        speed: 1
      });
    }
  } catch (e) {
    // Non-fatal if play art fails
  }
  if (outcome.category === 'loss' && /Sack/i.test(outcome.raw || '')) {
    vfxShake(fieldDisplay);
    vfxBanner('SACK!', '');
    SFX.onSack();
  }
  let yards = outcome.yards;
  let penalty = outcome.penalty;
  if (!penalty) {
    penalty = maybePenalty();
  }
  if (penalty) {
    handlePenaltyDecision({ offenseCard, outcome, penalty, yards, preBallOn: game.ballOn, preDown: game.down, preToGo: game.toGo, teamName });
    return;
  }
  let netYards = yards;
  // If no penalty defined in the chart result, apply the random penalty chance.
  if (!penalty) {
    penalty = maybePenalty();
  }
  // If there is a penalty, pause normal resolution and run accept/decline flow.
  if (penalty) {
    handlePenaltyDecision({
      offenseCard,
      outcome,
      penalty,
      yards,
      preBallOn: game.ballOn,
      preDown: game.down,
      preToGo: game.toGo,
      teamName
    });
    return;
  }
  // Apply penalty yards with rules fidelity. If the result was a long gain
  // ("LG") and a penalty is present, measure from the 50 yard line rather
  // than adding/subtracting yards from the result. Otherwise clamp the
  // penalty to no more than half the distance to the appropriate goal line.
  if (penalty) {
    // Determine if this play is a long gain (LG) result by checking the raw
    // outcome string. The raw field is set in parseResultString().
    const isLongGainResult = outcome.raw && /LG/.test(outcome.raw);
    // Compute the maximum penalty allowed based on distance to the relevant
    // goal line. Distances depend on current possession: the offense moves
    // toward the opponent's goal at 100 when the player has the ball, and
    // toward 0 when the AI has the ball. A penalty on the offense should
    // never move the ball more than half the distance to its own goal. A
    // penalty on the defense should never advance the ball more than half
    // the distance to the opponent's goal.
    let distanceToOwnGoal, distanceToOppGoal;
    if (game.possession === 'player') {
      distanceToOwnGoal = game.ballOn;
      distanceToOppGoal = 100 - game.ballOn;
    } else {
      // AI offense: its own goal is at 100, opponent's at 0
      distanceToOwnGoal = 100 - game.ballOn;
      distanceToOppGoal = game.ballOn;
    }
    let appliedPenaltyYards = penalty.yards;
    if (isLongGainResult) {
      // For long gain penalties, spot the ball from the 50 yard line. Do not
      // modify netYards; the repositioning will occur after updating ballOn.
      log(`Penalty on ${penalty.on}: ${penalty.yards} yards from the 50 yard line`);
    } else {
      // Limit the penalty to half the distance. Use Math.floor to avoid
      // exceeding the limit by rounding.
      if (penalty.on === 'offense') {
        const limit = Math.floor(distanceToOwnGoal / 2);
        appliedPenaltyYards = Math.min(appliedPenaltyYards, limit);
        netYards -= appliedPenaltyYards;
        log(formatPenaltyNarration('offense', appliedPenaltyYards, false, teamName));
      } else {
        const limit = Math.floor(distanceToOppGoal / 2);
        appliedPenaltyYards = Math.min(appliedPenaltyYards, limit);
        netYards += appliedPenaltyYards;
        const autoFD = penalty.firstDown === true;
        log(formatPenaltyNarration('defense', appliedPenaltyYards, autoFD, teamName));
      }
    }
    // Store the applied penalty yards so that long gain penalties can
    // reposition the ball correctly after computing net yards.
    penalty.appliedYards = appliedPenaltyYards;
    penalty.isLongGain = isLongGainResult;
  }
  // If the result is a change of possession, change possession immediately after
  // adjusting ball position with any return yardage from interceptions.
  if (outcome.turnover) {
    const newTeamName = game.possession === 'player' ? 'AWAY' : 'HOME';
    if (outcome.category === 'interception') {
      log(`Interception! ${newTeamName} takes over.`);
    } else {
      log(`Fumble! ${newTeamName} recovers.`);
    }
    // Flip possession without modifying ballOn yet. changePossession()
    // will flip the ballOn coordinate and reset down/toGo.
    changePossession();
    // Apply interception return if any.
    const returnYards = Math.abs(outcome.interceptReturn);
    if (outcome.category === 'interception' && returnYards) {
      if (game.possession === 'player') {
        game.ballOn += returnYards;
      } else {
        game.ballOn -= returnYards;
      }
      log(`Interception return: ${returnYards} ${returnYards === 1 ? 'yard' : 'yards'}`);
    }
    // Interception end-zone/limits handling:
    // - If spot ends inside defender's own end zone → touchback to own 20
    // - If spot would be past the back of defender's end zone → treat pass as incomplete (no turnover)
    // - If return crosses into offense's end zone → TD (handled below)
    if (game.possession === 'player') {
      // Player now on offense after INT: defender was AI; own end zone is at 0, opponent at 100
      if (game.ballOn < 0) {
        // beyond back of player end zone is not reachable due to clamp below; treat as incomplete instead of turnover
        // Revert turnover: give ball back to previous offense and revert field position
        changePossession(); // flips back to AI
        log('Pass ruled incomplete: ball would have been beyond the end line.');
        updateHUD();
        dealHands();
        return;
      }
      if (game.ballOn === 0) {
        // In player end zone as new offense → touchback to 20
        game.ballOn = 20;
        log('Interception in the end zone. Touchback. HOME ball at the 20.');
      }
    } else {
      // AI now on offense after INT: own end zone at 100
      if (game.ballOn > 100) {
        changePossession();
        log('Pass ruled incomplete: ball would have been beyond the end line.');
        updateHUD();
        dealHands();
        return;
      }
      if (game.ballOn === 100) {
        game.ballOn = 80;
        log('Interception in the end zone. Touchback. AWAY ball at the 20.');
      }
    }
    // Clamp ball position within bounds
    if (game.ballOn > 100) game.ballOn = 100;
    if (game.ballOn < 0) game.ballOn = 0;
    // Check for interception return touchdown (pick-six).
    let touchdownOnReturn = false;
    if (game.possession === 'player' && game.ballOn >= 100) {
      game.score.player += 6;
      log('Touchdown! HOME scores 6 points on the interception return.');
      touchdownOnReturn = true;
    } else if (game.possession === 'ai' && game.ballOn <= 0) {
      game.score.ai += 6;
      log('Touchdown! AWAY scores 6 points on the interception return.');
      touchdownOnReturn = true;
    }
    // Run the clock according to the time keeping table for turnovers.  After
    // the two-minute warning, turnovers still consume the standard time.
    game.clock -= calculateTimeOff(outcome);
    // Check for two-minute warning after adjusting the clock
    checkTwoMinuteWarning();
    handleClockAndQuarter();
    // Handle PAT sequence on pick-six before proceeding
    if (touchdownOnReturn) {
      if (game.possession === 'player') {
        game.awaitingPAT = true;
        patOptions.classList.remove('hidden');
        if (playZone) playZone.classList.add('hidden');
        updateHUD();
        return;
      } else {
        aiAttemptPAT();
        return;
      }
    }
    updateHUD();
    dealHands();
    return;
  }
  // Update ball position depending on who is on offense
  if (game.possession === 'player') {
    game.ballOn += netYards;
  } else {
    game.ballOn -= netYards;
  }
  // If the ball overshoots into the end zone, clamp to goal. Only log
  // "completion carries" phrasing for pass plays; for runs, rely on TD log.
  if (outcome.category !== 'incomplete' && (game.ballOn > 100 || game.ballOn < 0)) {
    if (game.ballOn > 100) game.ballOn = 100;
    if (game.ballOn < 0) game.ballOn = 0;
    if (offenseCard.type === 'pass') {
      log('Completion carries into the end zone for a touchdown.');
    }
  }
  // Clamp field
  if (game.ballOn > 100) game.ballOn = 100;
  if (game.ballOn < 0) game.ballOn = 0;
  // Safety detection: if the offense is tackled in its own end zone
  // (HOME offense at <=0; AWAY offense at >=100), score a safety.
  if (!game.gameOver) {
    let safetyScorer = null;
    if (game.possession === 'player' && game.ballOn <= 0) {
      safetyScorer = 'ai';
    } else if (game.possession === 'ai' && game.ballOn >= 100) {
      safetyScorer = 'player';
    }
    if (safetyScorer) {
      // Deduct time for the play, then handle safety and return
      let timeOffForPlay = calculateTimeOff(outcome);
      if (game.inTwoMinute && (outcome.outOfBounds || outcome.category === 'incomplete')) {
        timeOffForPlay = 0;
      }
      if (game.inUntimedDown) timeOffForPlay = 0;
      game.clock -= timeOffForPlay;
      checkTwoMinuteWarning();
      handleClockAndQuarter();
      handleSafety(safetyScorer);
      return;
    }
  }
  // If there was a long gain penalty, reposition the ball from midfield.
  if (penalty && penalty.isLongGain) {
    // Compute new spot relative to the 50 yard line. When the offense is
    // penalized, subtract yards; when the defense is penalized, add yards.
    let newSpot;
    if (game.possession === 'player') {
      newSpot = penalty.on === 'offense' ? 50 - penalty.appliedYards : 50 + penalty.appliedYards;
    } else {
      // AI offense moves toward 0; penalty on offense moves toward its own
      // goal (100) so we add yards; defense penalty moves toward player goal (0)
      newSpot = penalty.on === 'offense' ? 50 + penalty.appliedYards : 50 - penalty.appliedYards;
    }
    // Clamp newSpot and assign
    if (newSpot < 0) newSpot = 0;
    if (newSpot > 100) newSpot = 100;
    game.ballOn = newSpot;
  }
  // Provide a descriptive result line with correct gating for pass-only text.
  if (outcome.category === 'incomplete') {
    // Only passes can be incomplete
    if (offenseCard.type === 'pass') {
      log('The pass falls incomplete.');
    } else {
      log('No gain.');
    }
  } else {
    // Suppress redundant yardage line when a pass carry goes for a TD
    const wouldScoreTD = (game.possession === 'player')
      ? (game.ballOn + netYards >= 100)
      : (game.ballOn - netYards <= 0);
    const shouldSuppressForCarryTD = offenseCard.type === 'pass' && wouldScoreTD;
    if (!shouldSuppressForCarryTD) {
      if (netYards > 0) {
        const y = Math.abs(netYards);
        log(`Gain of ${y} ${y === 1 ? 'yard' : 'yards'}.`);
      } else if (netYards < 0) {
        const y = Math.abs(netYards);
        log(`Loss of ${y} ${y === 1 ? 'yard' : 'yards'}.`);
      } else {
        log('No gain.');
      }
    }
  }
  // Update yards to go and downs with penalty-aware logic.
  if (penalty) {
    // Automatic first down on qualifying defensive penalties
    if (penalty.on === 'defense' && penalty.firstDown) {
      game.down = 1;
      game.toGo = 10;
    } else {
      // Recompute distance to the original line-to-gain after enforcement.
      const newToGo = Math.max(1, Math.round(Math.abs(prevFirstDownAbs - game.ballOn)));
      // If the enforcement carried the ball past the line to gain, award a first down.
      if (newToGo <= 0) {
        game.down = 1;
        game.toGo = 10;
        log('First down!');
      } else {
        // Penalties generally repeat the down when no automatic first down is granted.
        game.toGo = newToGo;
        // Do not advance the down on penalties that do not award a first down.
      }
    }
  } else {
    // Non-penalty play: normal down-and-distance update using yards from the charts
    game.toGo -= yards;
    if (game.toGo <= 0) {
      game.down = 1;
      game.toGo = 10;
      // Suppress first down call if a touchdown will be logged below
      // Touchdown logging occurs later; we can check impending score now
      const impendingTD = (game.possession === 'player' && game.ballOn >= 100) || (game.possession === 'ai' && game.ballOn <= 0);
      if (!impendingTD) log('First down!');
    } else {
      game.down += 1;
    }
  }
  // Run clock according to the time keeping table. After the two-minute
  // warning, certain plays (incomplete passes, out-of-bounds gains and
  // first-down conversions) do not consume time. Determine if this play
  // resulted in a first down (excluding penalties on the offense) before
  // adjusting the clock.
  let timeOff = calculateTimeOff(outcome);
  // A play results in a first down when the offensive yards gained meet
  // or exceed the yards to go and the penalty (if any) is on the defense.
  const wouldReach = Math.abs(yards) >= game.toGo;
  const gainedFirstDown = (!penalty || penalty.on === 'defense') && wouldReach;
  if (game.inTwoMinute) {
    if (outcome.outOfBounds || outcome.category === 'incomplete' || gainedFirstDown) {
      timeOff = 0;
    }
  }
  // If we are in an untimed down, do not deduct time for this snap.
  if (game.inUntimedDown) {
    timeOff = 0;
  }
  game.clock -= timeOff;
  // After time deduction, check whether to announce the two-minute warning
  checkTwoMinuteWarning();
  // If a defensive penalty occurred and the clock expired in regulation,
  // schedule an untimed down per rules fidelity.
  if (penalty && penalty.on === 'defense' && game.quarter === 4 && game.clock <= 0) {
    game.pendingUntimedDown = true;
  }
  // Check for scoring
  let touchdown = false;
  if (game.possession === 'player' && game.ballOn >= 100) {
    touchdown = true;
    game.score.player += 6;
    log('Touchdown! HOME scores 6 points.');
  } else if (game.possession === 'ai' && game.ballOn <= 0) {
    touchdown = true;
    game.score.ai += 6;
    log('Touchdown! AWAY scores 6 points.');
  }
  // Safety detection: offense tackled in own end zone after applying yards/sacks
  // Player offense own end is at 0; AI offense own end is at 100.
  if (!touchdown) {
    if (game.possession === 'player' && game.ballOn <= 0) {
      handleSafety('ai');
      return;
    }
    if (game.possession === 'ai' && game.ballOn >= 100) {
      handleSafety('player');
      return;
    }
  }
  if (touchdown) {
    // Trigger PAT sequence differently for player and AI. When the
    // player scores, show the PAT options so they can choose. When the
    // AI scores, the computer will automatically decide whether to go
    // for two or kick an extra point based on the score and time.
    if (game.possession === 'player') {
      game.awaitingPAT = true;
      // In simulation mode, auto-resolve the player's PAT immediately.
      if (game.simulationMode) {
        const diff = game.score.ai - game.score.player; // positive means HOME trails
        if (diff === 1 || diff === 2) {
          attemptTwoPoint();
        } else {
          attemptExtraPoint();
        }
        return;
      }
      patOptions.classList.remove('hidden');
      // Ensure field goal option is hidden during PAT selection
      if (fgOptions) fgOptions.classList.add('hidden');
      // hide play zone (legacy) if present
      if (playZone) playZone.classList.add('hidden');
      updateHUD();
      return;
    } else {
      // AI will attempt its PAT immediately
      // Ensure field goal option is hidden during PAT resolution
      if (fgOptions) fgOptions.classList.add('hidden');
      aiAttemptPAT();
      return;
    }
  }
  // Check for change of possession on downs
  if (game.down > 4) {
    const nextTeam = game.possession === 'player' ? 'AWAY' : 'HOME';
    log(`On downs, ${nextTeam} takes over.`);
    changePossession();
  }
  // Check if ball has crossed midfield to update measurement orientation
  // Not needed since we measure from player's end zone consistently
  // Check quarter/time expiration
  handleClockAndQuarter();
  updateHUD();
}

function resolvePunt() {
  // Narrate punt and use tables for distance and return.
  log('');
  const puntingTeam = game.possession === 'player' ? 'HOME' : 'AWAY';
  const receivingTeam = game.possession === 'player' ? 'AWAY' : 'HOME';
  const startSpot = formatYardForLog(game.ballOn);
  log(`${puntingTeam} lines up to punt from the ${startSpot} yard line.`);
  // Roll 2D6 for punt distance
  const distRoll = rollD6() + rollD6();
  const puntDistance = PUNT_DISTANCE_TABLE[distRoll] || 40;
  log(`Punt travels ${puntDistance} yards.`);
  // Advance the ball to the catch/return spot
  if (game.possession === 'player') {
    game.ballOn += puntDistance;
  } else {
    game.ballOn -= puntDistance;
  }
  // End zone handling
  if (game.ballOn > 100 || game.ballOn < 0) {
    // Through end zone → automatic touchback, ignore return choice
    if (game.ballOn > 100) {
      game.ballOn = 80;
    } else {
      game.ballOn = 20;
    }
    log('Punt sails through the end zone. Touchback to the 20.');
    game.possession = game.possession === 'player' ? 'ai' : 'player';
    game.down = 1; game.toGo = 10;
  } else if (game.ballOn === 100 || game.ballOn === 0) {
    // Lands in end zone: receiving team choice to return or down at 20
    const receivingIsPlayer = game.possession === 'ai';
    const teamName = receivingIsPlayer ? 'HOME' : 'AWAY';
    const doDownAt20 = () => {
      game.ballOn = receivingIsPlayer ? 20 : 80;
      log(`${teamName} choose to down it in the end zone. Touchback to the 20.`);
      game.possession = game.possession === 'player' ? 'ai' : 'player';
      game.down = 1; game.toGo = 10;
    };
    const doReturn = () => {
      log(`${teamName} elect to return from the end zone.`);
      // Resolve return as normal from the end zone spot (0 or 100)
      const retRoll = rollD6() + rollD6();
      const ret = PUNT_RETURN_TABLE[retRoll] || { yards: 0 };
      let returnYards = 0;
      let fumbleTurnover = false;
      if (ret.type === 'FC') {
        log(`${teamName} signals for a fair catch in the end zone.`);
      } else if (ret.type === 'LG') {
        returnYards = resolveLongGain();
        log(`${teamName} with a big return of ${returnYards} yards!`);
      } else {
        returnYards = ret.yards || 0;
        if (returnYards > 0) log(`${teamName} returns it ${returnYards} yards.`);
        if (retRoll <= 4) {
          if (Math.random() < 0.15) {
            log('Returner fumbles!');
            fumbleTurnover = Math.random() < 0.5;
          }
        }
      }
      if (game.possession === 'player') {
        // Player punted; AI receiving towards 0
        game.ballOn -= returnYards;
      } else {
        game.ballOn += returnYards;
      }
      if (game.ballOn > 100) game.ballOn = 100;
      if (game.ballOn < 0) game.ballOn = 0;
      if (!fumbleTurnover) {
        game.possession = game.possession === 'player' ? 'ai' : 'player';
        game.down = 1; game.toGo = 10;
        log(`Possession changes to ${game.possession === 'player' ? 'HOME' : 'AWAY'}.`);
      } else {
        const recovering = game.possession === 'player' ? 'HOME' : 'AWAY';
        log(`Ball is loose and recovered by ${recovering}!`);
      }
    };
    if (receivingIsPlayer) {
      // In simulation mode, auto-decide without showing a modal
      if (game.simulationMode) {
        const shouldReturn = (function(){
          if (game.quarter === 4 && game.clock < 2 * 60) {
            const diff = (game.score.player - game.score.ai);
            return diff < 0; // if HOME trailing, try to return
          }
        return false; })();
        if (shouldReturn) doReturn(); else doDownAt20();
      } else if (!puntEZModal) {
        doDownAt20();
      } else {
        const text = document.getElementById('punt-ez-text');
        text.textContent = 'Punt lands in the end zone. Return or take touchback at the 20?';
        puntEZModal.style.display = 'block';
        puntEZReturnBtn.onclick = () => {
          puntEZModal.style.display = 'none';
          doReturn();
          finalizeAfterPunt();
        };
        puntEZDownBtn.onclick = () => {
          puntEZModal.style.display = 'none';
          doDownAt20();
          finalizeAfterPunt();
        };
        return; // will finalize in callbacks
      }
    } else {
      // AI decides: simple heuristic — if deep in own end (which it is), usually down it unless trailing late
      const shouldReturn = (function(){
        if (game.quarter === 4 && game.clock < 2 * 60) {
          const diff = (game.score.player - game.score.ai);
          return diff > 0; // if AI trailing, try to return
        }
        return false;
      })();
      if (shouldReturn) doReturn(); else doDownAt20();
    }
  } else {
    // In play: resolve return
    const retRoll = rollD6() + rollD6();
    const ret = PUNT_RETURN_TABLE[retRoll] || { yards: 0 };
    let returnYards = 0;
    let fumbleTurnover = false;
    if (ret.type === 'FC') {
      log(`${receivingTeam} signals for a fair catch.`);
    } else if (ret.type === 'LG') {
      returnYards = resolveLongGain();
      log(`${receivingTeam} with a big return of ${returnYards} yards!`);
    } else {
      returnYards = ret.yards || 0;
      if (returnYards > 0) {
        log(`${receivingTeam} returns it ${returnYards} yards.`);
      } else {
        log('No return.');
      }
      // Small chance of fumble on mid results
      if (retRoll <= 4) {
        if (Math.random() < 0.15) {
          log('Returner fumbles!');
          // 50/50 recovery for kicking team
          fumbleTurnover = Math.random() < 0.5;
        }
      }
    }
    // Apply return yards opposite to punt direction since receiving team is advancing
    if (game.possession === 'player') {
      // Player punted; AI receiving advances towards 0 → subtract yards
      game.ballOn -= returnYards;
    } else {
      // AI punted; HOME receiving advances towards 100 → add yards
      game.ballOn += returnYards;
    }
    // Clamp bounds
    if (game.ballOn > 100) game.ballOn = 100;
    if (game.ballOn < 0) game.ballOn = 0;
    // Change possession after the kick unless the kicking team recovers a fumble on the return
    if (fumbleTurnover) {
      const recovering = game.possession === 'player' ? 'HOME' : 'AWAY';
      log(`Ball is loose and recovered by ${recovering}!`);
      // Kicking team recovers: possession stays with current punting team
      // Move ballOn slightly in the direction of kicking team as recovery spot already reflected by returnYards
    } else {
      game.possession = game.possession === 'player' ? 'ai' : 'player';
      game.down = 1; game.toGo = 10;
      const newTeam = game.possession === 'player' ? 'HOME' : 'AWAY';
      log(`Possession changes to ${newTeam}.`);
    }
  }
  finalizeAfterPunt();
}

function finalizeAfterPunt() {
  updateFGOptions();
  // Deduct time for the punt (15 seconds) and handle clock/quarter
  game.clock -= TIME_KEEPING.punt;
  checkTwoMinuteWarning();
  handleClockAndQuarter();
  updateHUD();
  dealHands();
}

// Start a new game using test setup controls (DEV MODE)
function startNewGameWithTestSetup() {
  // Fallback: if test controls are missing, use normal flow
  if (!testPlayerDeck || !testAiDeck || !testPossession || !testBallOn || !testDown || !testToGo || !testQuarter || !testClock) {
    startNewGame();
    return;
  }
  const pDeck = testPlayerDeck.value;
  const aDeck = testAiDeck.value;
  const poss = testPossession.value === 'ai' ? 'ai' : 'player';
  let ball = parseInt(testBallOn.value, 10);
  let down = parseInt(testDown.value, 10);
  let togo = parseInt(testToGo.value, 10);
  let quarter = parseInt(testQuarter.value, 10);
  // Parse mm:ss clock
  const parts = String(testClock.value || '15:00').split(':');
  let mins = parseInt(parts[0], 10) || 0;
  let secs = parseInt(parts[1], 10) || 0;
  let clock = mins * 60 + secs;

  // Clamp values
  ball = Math.max(1, Math.min(99, ball));
  down = Math.max(1, Math.min(4, down));
  togo = Math.max(1, Math.min(99, togo));
  quarter = Math.max(1, Math.min(4, quarter));
  clock = Math.max(0, Math.min(15 * 60, clock));

  // Initialize game state
  game.offenseDeck = pDeck;
  game.aiOffenseDeck = aDeck;
  game.rng = () => Math.random();
  game.quarter = quarter;
  game.clock = clock;
  game.down = down;
  game.toGo = togo;
  game.ballOn = ball;
  game.score.player = 0;
  game.score.ai = 0;
  game.possession = poss;
  game.awaitingPAT = false;
  game.awaitingFG = false;
  game.gameOver = false;
  game.overlayActive = false;
  game.twoMinuteWarningAnnounced = false;
  game.inTwoMinute = false;
  logClear();
  log(`Test setup: ${poss === 'player' ? 'HOME' : 'AWAY'} ball on ${ball}, ${down} & ${togo}, Q${quarter} ${mins}:${secs.toString().padStart(2,'0')}`);
  // No kickoff in test setup; just render and hands
  updateHUD();
  dealHands();
}

// -----------------------------------------------------------------------------
// Determine the outcome of a play by looking up the offensive and defensive
// cards in the OFFENSE_CHARTS. Returns an object describing yards gained
// or lost, penalties and turnovers. This replaces the heuristic yardage
// generator used previously. See parseResultString() for details on the
// outcome structure.
function determineOutcome(offCard, defCard) {
  // If the offense card is a punt, we do not consult the charts. Punt
  // resolution is handled separately in resolvePlay(). Return 0 yards.
  if (offCard.type === 'punt') {
    return { yards: 0, penalty: null, turnover: false, interceptReturn: 0, firstDown: false };
  }
  // Determine which deck the offense card belongs to based on who has
  // possession. If the player is on offense, use game.offenseDeck; if
  // the AI is on offense, use game.aiOffenseDeck. Deck names in
  // OFFENSE_CHARTS must match these values exactly.
  // Determine the deck key based on possession and map it to the JSON key
  const deckName = game.possession === 'player' ? game.offenseDeck : game.aiOffenseDeck;
  const chartDeckKey = DECK_NAME_TO_CHART_KEY[deckName] || deckName;
  // Map the play label to the key used in the JSON charts
  const playName = offCard.label;
  const chartPlayKey = LABEL_TO_CHART_KEY[playName] || playName;
  // Look up the defensive letter based on the defensive card label.
  const defNum = DEF_LABEL_TO_NUM[defCard.label];
  const defLetter = DEF_NUM_TO_LETTER[defNum];
  // Find the result string from the full charts. If undefined, treat as 0 yards.
  let resultStr = null;
  if (FULL_OFFENSE_CHARTS[chartDeckKey] && FULL_OFFENSE_CHARTS[chartDeckKey][chartPlayKey]) {
    resultStr = FULL_OFFENSE_CHARTS[chartDeckKey][chartPlayKey][defLetter];
  }
  // Parse the result string into an outcome object.
  const outcome = parseResultString(resultStr);
  return outcome;
}

// -----------------------------------------------------------------------------
// Helpers to generate radio‑style commentary.  These functions analyse the
// offensive card to describe the formation and the quarterback's initial
// action.  The formation descriptions are deliberately simple so they can
// apply broadly across play types without requiring detailed formation data.

/**
 * Return a short phrase describing the offensive formation.
 * Runs are typically from under centre unless the play suggests a draw or
 * quarterback keeper; passes are generally from the shotgun.  Trick plays
 * and special teams return an empty string so that the caller can
 * conditionally omit the formation line.
 * @param {Object} card Offensive play card
 * @returns {string|null}
 */
function getFormationDescription(card) {
  if (!card || !card.type) return null;
  if (card.type === 'run') {
    // Draws and QB keepers often originate from the shotgun to spread the defence
    if (/Draw/i.test(card.label) || /QB Keeper/i.test(card.label)) {
      return 'in the shotgun';
    }
    return 'under center';
  } else if (card.type === 'pass') {
    // Most pass plays are from the shotgun
    return 'in the shotgun';
  } else if (card.type === 'punt') {
    // Special teams; the punt team lines up separately
    return null;
  }
  // Default: unknown trick play
  return null;
}

/**
 * Return a descriptive phrase for the quarterback's action at the snap.
 * The phrase is tailored to the play label.  This does not include
 * yardage or result – it simply sets up the action.
 * @param {Object} card Offensive play card
 * @returns {string}
 */
function describePlayAction(card) {
  if (!card || !card.type) return '';
  if (card.type === 'run') {
    // Running plays
    if (/QB/i.test(card.label)) {
      return 'keeps it himself and runs';
    } else if (/Draw/i.test(card.label)) {
      return 'delays and hands off on a draw play';
    } else if (/End Run/i.test(card.label) || /Reverse/i.test(card.label)) {
      return 'hands off around the end';
    } else if (/Slant Run/i.test(card.label) || /Slant/i.test(card.label)) {
      return 'hands off on an inside slant run';
    } else if (/Power Off Tackle/i.test(card.label) || /Off Tackle/i.test(card.label)) {
      return 'hands off off tackle';
    } else {
      return 'hands off to the running back';
    }
  } else if (card.type === 'pass') {
    // Passing plays
    if (/Long Bomb/i.test(card.label) || /Deep/i.test(card.label)) {
      return 'launches a deep pass downfield';
    } else if (/Sideline Pass/i.test(card.label) || /Sideline/i.test(card.label)) {
      return 'fires toward the sideline';
    } else if (/Screen Pass/i.test(card.label) || /Screen/i.test(card.label)) {
      return 'sets up a screen pass';
    } else if (/Flair Pass/i.test(card.label) || /Flair/i.test(card.label)) {
      return 'throws a flare pass to the back';
    } else if (/Look In Pass/i.test(card.label) || /Button Hook Pass/i.test(card.label) || /Look\s*In/i.test(card.label) || /Button\s*Hook/i.test(card.label)) {
      return 'throws a quick pass over the middle';
    } else if (/Pop Pass/i.test(card.label)) {
      return 'pops a pass over the linebackers';
    } else {
      return 'drops back and throws';
    }
  } else if (card.type === 'punt') {
    return 'booms a punt downfield';
  }
  return 'runs a trick play';
}

function maybePenalty() {
  // 10% chance of penalty
  if (game.rng() < 0.1) {
    // 50/50 offense or defense
    const on = game.rng() < 0.5 ? 'offense' : 'defense';
    // Penalty yards: 5 or 10
    const yards = game.rng() < 0.5 ? 5 : 10;
    return { on, yards };
  }
  return null;
}

function changePossession() {
  // Switch which team has possession.  Do not flip the ball position;
  // ballOn always represents distance from the HOME team's goal.  Reset
  // downs and distance and announce the change using team names.  This
  // maintains a consistent left‑to‑right orientation for HOME and
  // right‑to‑left for AWAY throughout the game.
  game.possession = game.possession === 'player' ? 'ai' : 'player';
  // Reset downs and distance
  game.down = 1;
  game.toGo = 10;
  const newTeam = game.possession === 'player' ? 'HOME' : 'AWAY';
  log(`Possession changes to ${newTeam}.`);
  // After change, update FG options
  updateFGOptions();
}

// Handle safety scoring and subsequent free kick by team scored against.
// scorer is 'player' or 'ai' indicating who receives 2 points.
function handleSafety(scorer) {
  if (scorer === 'player') {
    game.score.player += 2;
    log('Safety! HOME is awarded 2 points.');
  } else {
    game.score.ai += 2;
    log('Safety! AWAY is awarded 2 points.');
  }
  if (game.gameOver) return;
  // Free kick by team scored against from its own 20.
  const freeKicker = scorer === 'player' ? 'ai' : 'player';
  // Set ball to 20 for the kicking team perspective before kick
  game.possession = freeKicker === 'player' ? 'ai' : 'player'; // receiving set temporarily for kickoff logic below
  // Present choice: Safety kickoff (+25) or Free kick punt
  const doSafetyKickoff = () => {
    // Safety kickoff uses normal kickoff table, plus +25 to final yardline result.
    const kickerTeam = freeKicker;
    const result = resolveKickoff(false, kickerTeam);
    let yard = result.yardLine + 25;
    if (yard > 100) yard = 100;
    // Receiving team is opposite of kicker
    game.possession = kickerTeam === 'player' ? 'ai' : 'player';
    if (!result.turnover) {
      if (game.possession === 'player') {
        game.ballOn = yard;
        log(`Safety kickoff returned to the ${formatYardForLog(yard)}. HOME takes over.`);
      } else {
        game.ballOn = 100 - yard;
        log(`Safety kickoff returned to the ${formatYardForLog(yard)}. AWAY takes over.`);
      }
    } else {
      if (kickerTeam === 'player') {
        game.possession = 'player';
        game.ballOn = 100 - yard;
      } else {
        game.possession = 'ai';
        game.ballOn = yard;
      }
      const recoveringTeam = game.possession === 'player' ? 'HOME' : 'AWAY';
      log(`Kickoff fumble on safety kick! ${recoveringTeam} recover at the ${formatYardForLog(yard)}.`);
    }
    game.down = 1; game.toGo = 10;
    game.clock -= TIME_KEEPING.kickoff;
    checkTwoMinuteWarning();
    handleClockAndQuarter();
    updateHUD();
    dealHands();
  };
  const doFreeKickPunt = () => {
    // Model as a punt from the kicking team's 20 with no rush
    const wasPossession = game.possession;
    game.possession = freeKicker; // set offense to kicking team for punt resolution
    const originalBallOn = game.ballOn;
    game.ballOn = freeKicker === 'player' ? 20 : 80;
    log('Free kick punt from the 20 after safety.');
    if (!game.gameOver) resolvePunt();
    // resolvePunt handles time and possession; ensure time matches punt category
  };
  const kickerIsAI = freeKicker === 'ai';
  if (kickerIsAI || game.simulationMode) {
    // AI chooses: simple heuristic — if trailing, try kickoff (+25) for better field; else punt
    const trailing = game.score.ai < game.score.player;
    if (trailing) doSafetyKickoff(); else doFreeKickPunt();
  } else {
    if (!safetyModal) {
      doSafetyKickoff();
    } else {
      const text = document.getElementById('safety-text');
      text.textContent = 'Safety free kick: choose Safety Kickoff (+25 yards to result) or Free Kick Punt from the 20.';
      safetyModal.style.display = 'block';
      safetyKickoffBtn.onclick = () => {
        safetyModal.style.display = 'none';
        doSafetyKickoff();
      };
      safetyFreePuntBtn.onclick = () => {
        safetyModal.style.display = 'none';
        doFreeKickPunt();
      };
    }
  }
}
function handleClockAndQuarter() {
  // If clock reaches zero, advance quarter
  while (game.clock <= 0 && !game.gameOver) {
    // Do not end the game immediately if an untimed down is pending due to a defensive penalty
    if (game.quarter === 4 && game.pendingUntimedDown) {
      log('Untimed down will be played due to a defensive penalty.');
      // Clear the pending flag and hold at 0:00 until the next snap resolves
      game.pendingUntimedDown = false;
      game.inUntimedDown = true;
      // Prevent quarter advancement/end for now
      break;
    }
    // If we just finished an untimed down, allow game to end or proceed
    if (game.quarter === 4 && game.inUntimedDown) {
      // After resolving the untimed down, we end the game if in 4th quarter.
      game.inUntimedDown = false;
      endGame();
      break;
    }
    game.quarter += 1;
    if (game.quarter > 4) {
      endGame();
      break;
    }
    game.clock += 15 * 60; // add quarter length
    log(`Start of quarter ${game.quarter}.`);
    // Kickoff at start of 3rd quarter (start of second half)
    if (game.quarter === 3) {
      // Second half receiver is determined by opening choice logic
      if (game.secondHalfReceiver === 'player' || game.secondHalfReceiver === 'ai') {
        game.possession = game.secondHalfReceiver;
      } else {
        // Fallback to opposite of who received opening
        game.possession = game.possession === 'player' ? 'ai' : 'player';
      }
      log('Start of second half. ' + (game.possession === 'player' ? 'HOME' : 'AWAY') + ' receives.');
      kickoff();
    }
    // Reset two-minute warning flags when a new quarter begins
    game.twoMinuteWarningAnnounced = false;
    game.inTwoMinute = false;
  }
}

function endGame() {
  game.gameOver = true;
  // Hide special teams options at the end of the game.
  patOptions.classList.add('hidden');
  fgOptions.classList.add('hidden');
  log('Game over! Final score: HOME ' + game.score.player + ' — AWAY ' + game.score.ai);
}

// Extra point attempt after touchdown
function attemptExtraPoint() {
  // Resolve PAT using the place kicking table (2D6). A result of 'G'
  // means the kick is good. Otherwise it is no good.
  const roll = rollD6() + rollD6();
  let row = PLACE_KICK_TABLE_DATA ? (PLACE_KICK_TABLE_DATA[roll] || {}) : (PLACE_KICK_TABLE[roll] || {});
  const success = row.PAT === 'G';
  if (success) {
    if (game.possession === 'player') {
      game.score.player += 1;
      log('Extra point is good.');
    } else {
      game.score.ai += 1;
      log('AI extra point is good.');
    }
  } else {
    log('Extra point missed.');
  }
  // Extra points consume no time
  game.clock -= TIME_KEEPING.extraPoint;
  finishPAT();
}

function attemptTwoPoint() {
  // 50% success: treat as run vs run defense from 2 yards out
  if (game.rng() < 0.5) {
    if (game.possession === 'player') {
      game.score.player += 2;
      log('Two‑point conversion succeeds!');
    } else {
      game.score.ai += 2;
      log('AI two‑point conversion succeeds.');
    }
  } else {
    log('Two‑point conversion fails.');
  }
  finishPAT();
}

function finishPAT() {
  game.awaitingPAT = false;
  patOptions.classList.add('hidden');
  // After PAT, change possession and kickoff
  game.possession = game.possession === 'player' ? 'ai' : 'player';
  if (!game.gameOver) kickoff();
  handleClockAndQuarter();
  updateHUD();
  dealHands();
}

/**
 * Decide and perform the AI's conversion after a touchdown. The AI will
 * attempt a two‑point conversion if doing so could tie or bring the
 * game within one point. Otherwise it will kick an extra point. Success
 * rates are 50% for two‑point tries and 98% for extra point kicks.
 */
function aiAttemptPAT() {
  // Determine the score difference from the AI's perspective after its
  // touchdown has been counted. Positive diff => player leads.
  const diff = game.score.player - game.score.ai;
  const quarter = game.quarter;
  const clock = game.clock;
  const late = quarter === 4 && clock <= 5 * 60;
  const coach = getCoachProfile();
  // Go for two when trailing by 1 or 2 (tie or take lead).
  // Aggressive coaches may also go for two when leading by 1 very late to go up 3.
  let shouldGoForTwo = (diff > 0 && diff <= 2);
  if (coach.twoPointAggressiveLate && diff < 0 && diff === -1 && late) {
    shouldGoForTwo = true;
  }
  if (shouldGoForTwo) {
    if (game.rng() < 0.5) {
      game.score.ai += 2;
      log('AI two‑point conversion is good.');
    } else {
      log('AI two‑point conversion fails.');
    }
    game.clock -= TIME_KEEPING.extraPoint;
  } else {
    // Extra point attempt using the place kicking table
    const roll = rollD6() + rollD6();
    const row = PLACE_KICK_TABLE_DATA ? (PLACE_KICK_TABLE_DATA[roll] || {}) : (PLACE_KICK_TABLE[roll] || {});
    const success = row.PAT === 'G';
    if (success) {
      game.score.ai += 1;
      log('AI extra point is good.');
    } else {
      log('AI extra point missed.');
    }
    game.clock -= TIME_KEEPING.extraPoint;
  }
  // Finish PAT sequence and kickoff
  finishPAT();
}

// Field goal attempt
function attemptFieldGoal() {
  // Determine distance: distance from ball to opponent goal line
  const distance = game.possession === 'player' ? 100 - game.ballOn : game.ballOn;
  // Use attempt distance including placement (hash + end zone): common convention adds 17-18; we use 18
  const attemptYards = distance + 18;
  // Determine the column for the place kicking table
  let col;
  if (distance <= 12) {
    col = '1-12';
  } else if (distance <= 22) {
    col = '13-22';
  } else if (distance <= 32) {
    col = '23-32';
  } else if (distance <= 38) {
    col = '33-38';
  } else if (distance <= 45) {
    col = '39-45';
  } else {
    // Out of range: automatically no good
    col = null;
  }
  let success = false;
  if (col) {
    const roll = rollD6() + rollD6();
    if (PLACE_KICK_TABLE_DATA) {
      const row = PLACE_KICK_TABLE_DATA[roll] || {};
      success = row[col] === 'G';
    } else {
      const row = PLACE_KICK_TABLE[roll] || {};
      success = row[col] === 'G';
    }
  }
  if (success) {
    if (game.possession === 'player') {
      game.score.player += 3;
      log(`They line up for a ${attemptYards} yard field goal attempt... and it's GOOD!`);
    } else {
      game.score.ai += 3;
      log(`They line up for a ${attemptYards} yard field goal attempt... and it's GOOD!`);
    }
  } else {
    const missSide = Math.random() < 0.5 ? 'wide left' : 'wide right';
    log(`They line up for a ${attemptYards} yard field goal attempt... and they MISS, ${missSide}.`);
    // Missed FG spotting per rules: flip possession, spot at kick spot if beyond 20, else at 20.
    // Spot of kick is LOS minus 7 yards relative to offense direction.
    const los = game.ballOn; // absolute
    let spotOfKick;
    if (game.possession === 'player') {
      spotOfKick = Math.max(0, los - 7);
    } else {
      spotOfKick = Math.min(100, los + 7);
    }
    // Flip possession first
    game.possession = game.possession === 'player' ? 'ai' : 'player';
    // Determine new ball placement for defense
    if (game.possession === 'player') {
      // Player takes over after AI miss. If spot is outside end zone, take over at max(20, spot) relative to HOME goal.
      if (spotOfKick >= 20) {
        game.ballOn = spotOfKick; // absolute from HOME goal
        log(`Missed field goal: HOME takes over at the spot of the kick (${formatYardForLog(spotOfKick)}).`);
      } else {
        game.ballOn = 20;
        log('Missed field goal: HOME takes over at the 20.');
      }
    } else {
      // AI takes over after player miss. If spot (absolute) is <= 80 (i.e., at least 20 yards from AI goal), take at spot; else at its 20 (absolute 80)
      if (spotOfKick <= 80) {
        game.ballOn = spotOfKick;
        log(`Missed field goal: AWAY takes over at the spot of the kick (${formatYardForLog(spotOfKick)}).`);
      } else {
        game.ballOn = 80;
        log('Missed field goal: AWAY takes over at the 20.');
      }
    }
    game.down = 1; game.toGo = 10;
  }
  // After FG attempt, standard timing
  game.awaitingFG = false;
  fgOptions.classList.add('hidden');
  // Deduct time for the field goal itself
  game.clock -= TIME_KEEPING.fieldgoal;
  // Check for two-minute warning after field goal attempt
  checkTwoMinuteWarning();
  // On make: kickoff; on miss: no kickoff
  if (success && !game.gameOver) {
    // Flip possession and kickoff after made FG
    game.possession = game.possession === 'player' ? 'ai' : 'player';
    if (!game.gameOver) kickoff();
  }
  // Update UI and hands
  if (!game.gameOver) {
    updateHUD();
    dealHands();
  }
}

// HUD and logging helpers
function updateHUD() {
  const prevText = scoreDisplay.textContent;
  const newText = `HOME ${game.score.player} — AWAY ${game.score.ai}`;
  scoreDisplay.textContent = newText;
  if (prevText !== newText) {
    scoreDisplay.classList.remove('score-pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('score-pop');
  }
  hudQuarter.textContent = `Q${game.quarter}`;
  hudClock.textContent = formatTime(Math.max(game.clock, 0));
  // Format down & distance
  const downNames = ['1st', '2nd', '3rd', '4th'];
  const downStr = downNames[Math.min(game.down, 4) - 1] || `${game.down}th`;
  hudDownDistance.textContent = `${downStr} & ${game.toGo}`;
  // Display the ball spot as a value from 0 to 50 yards regardless of
  // orientation. Once the ball crosses midfield, we show the distance
  // from the opposite end zone (e.g. ball on 60 becomes 40).
  const displaySpot = game.ballOn <= 50 ? game.ballOn : 100 - game.ballOn;
  hudBallSpot.textContent = `Ball on ${Math.round(displaySpot)}`;
  hudPossession.textContent = game.possession === 'player' ? 'HOME' : 'AWAY';

  // Update the field overlay lines. The field background represents the
  // full 100 yards (0 at the left edge and 100 at the right edge). We use
  // absolute yard values (0–100) directly for positioning so that:
  // - When HOME has the ball (moving 0→100), the first down line appears to
  //   the right of the scrimmage line.
  // - When AWAY has the ball (moving 100→0), the first down line appears to
  //   the left of the scrimmage line (since firstDownAbsolute < ballOn).
  // This avoids mirroring which inverted the relative ordering.
  if (scrimmageLineEl && firstDownLineEl) {
    // Compute absolute yard line for the first down based on possession.
    let firstDownAbsolute;
    if (game.possession === 'player') {
      firstDownAbsolute = game.ballOn + game.toGo;
    } else {
      firstDownAbsolute = game.ballOn - game.toGo;
    }
    // Clamp within bounds
    firstDownAbsolute = Math.max(0, Math.min(100, firstDownAbsolute));
    // Determine percent positions across the field using absolute yard values.
    // Each yard corresponds to 1% of the width.
    let scrimmagePercent = yardToPercent(game.ballOn);
    let firstDownPercent = yardToPercent(firstDownAbsolute);
    // Clamp the lines slightly inside the field to ensure they are visible
    const clamp = (val) => Math.max(5.5, Math.min(94.5, val));
    scrimmageLineEl.style.left = `${clamp(scrimmagePercent)}%`;
    firstDownLineEl.style.left = `${clamp(firstDownPercent)}%`;

    // Show red zone shading when the ball is in either 20‑yard zone. For
    // simplicity we base this on the absolute ball position (0–100). When
    // ballOn <= 20 the player's end zone is threatened; when ballOn >= 80 the
    // opponent's end zone is threatened. The overlay covers the full
    // 20‑yard width and is hidden otherwise.
    if (redZoneEl) {
      if (game.ballOn <= 20) {
        redZoneEl.style.display = 'block';
        redZoneEl.style.left = '0%';
        redZoneEl.style.width = '20%';
      } else if (game.ballOn >= 80) {
        redZoneEl.style.display = 'block';
        redZoneEl.style.left = '80%';
        redZoneEl.style.width = '20%';
      } else {
        redZoneEl.style.display = 'none';
      }
    }
    // Position the chain marker along the sideline at the first down
    // location. If the first down line is off the field (e.g. beyond 0–100)
    // we still clamp its position inside the field. Always show the
    // chain marker once a game has started.
    if (chainMarkerEl) {
      chainMarkerEl.style.display = 'block';
      chainMarkerEl.style.left = `${clamp(firstDownPercent)}%`;
    }

    // Ensure both overlay lines remain visible. In some edge cases (e.g. after
    // turnovers) CSS rules may hide these elements. Explicitly reset
    // their display property so that the blue scrimmage line and yellow first
    // down line always render after updateHUD() is called.
    scrimmageLineEl.style.display = 'block';
    firstDownLineEl.style.display = 'block';
  }
}

/**
 * Display the player's chosen card and the AI's chosen card on the field for
 * a brief period. The cards are positioned relative to the field based on
 * where the user dropped their card (x,y). If x/y are not provided (for
 * example when selecting a card via click), a default position is used.
 * The overlay cards are removed automatically after three seconds.
 *
 * @param {Object} playerCard The card played by the user.
 * @param {Object} aiCard The card selected by the AI.
 * @param {number} [x] The horizontal drop coordinate within the field (pixels).
 * @param {number} [y] The vertical drop coordinate within the field (pixels).
 */
function showCardOverlay(playerCard, aiCard, x, y, done) {
  if (!fieldDisplay) return;
  // Set overlay active to block further plays while the cards are visible
  game.overlayActive = true;
  const rect = fieldDisplay.getBoundingClientRect();
  const fieldW = rect.width;
  const fieldH = rect.height;
  // Determine player's card drop position; default near the bottom centre
  let px = typeof x === 'number' ? x : fieldW * 0.5;
  let py = typeof y === 'number' ? y : fieldH * 0.7;
  // Base card dimensions (overlay will be scaled via CSS transform)
  const baseW = 90;
  const baseH = 140;
  const halfW = baseW / 2;
  const halfH = baseH / 2;
  // Clamp to keep card within field bounds
  px = Math.max(halfW, Math.min(fieldW - halfW, px));
  py = Math.max(halfH, Math.min(fieldH - halfH, py));
  // Create player's overlay card
  const pEl = document.createElement('div');
  pEl.className = 'overlay-card';
  pEl.style.backgroundImage = `url('${playerCard.art}')`;
  pEl.style.left = `${px - halfW}px`;
  pEl.style.top = `${py - halfH}px`;
  // Create AI overlay card
  let aiX = px;
  let aiY = fieldH * 0.25;
  aiX = Math.max(halfW, Math.min(fieldW - halfW, aiX));
  const aEl = document.createElement('div');
  aEl.className = 'overlay-card';
  aEl.style.backgroundImage = `url('${aiCard.art}')`;
  aEl.style.left = `${aiX - halfW}px`;
  aEl.style.top = `${aiY - halfH}px`;
  // Append to field
  fieldDisplay.appendChild(pEl);
  fieldDisplay.appendChild(aEl);
  // Remove after three seconds and clear overlay active flag
  setTimeout(() => {
    pEl.remove();
    aEl.remove();
    game.overlayActive = false;
    if (typeof done === 'function') done();
  }, 3000);
}

// Basic play art renderer: shows offense circles, defense Xs, and a simple route/ball motion.
// removed

// Render from JSON definition (offense only). Direction: player drives L→R, AI R→L.
function renderJsonPlayArt(def, outcome, startDelayMs = 0, defDefense = null) {
  return; // animations removed
}

// Render from JSON definition (offense only). Direction: player drives L→R, AI R→L.
function renderJsonPlayArt(def, outcome, startDelayMs = 0, defDefense = null) {
  if (!def || !def.play_art || !def.play_art.animation_blueprint) return;
  if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'start', id: def && def.id, play: (def && (def.play_name||def.label)) || 'unknown', startDelayMs, outcome, defenseId: defDefense && defDefense.id });
  clearPlayArt();
  const bp = def.play_art.animation_blueprint;
  const entities = bp.entities || [];
  const originAbs = game.ballOn; // LOS center x reference in absolute yards
  const dir = game.possession === 'player' ? 1 : -1; // L→R for player, R→L for AI
  try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'setup', originAbs, dir, possession: game.possession, ballOn: game.ballOn, toGo: game.toGo }); } catch {}

  // Helpers to convert normalized blueprint coords to SVG coords
  function normToSvg(point) {
    // Map blueprint downfield (y) to field X (yards), and blueprint lateral (x) to SVG Y (screen rows)
    // Use a tighter downfield scaling so short steps don't look like giant leaps.
    const yardsPerUnitDownfield = 40; // 0.10 -> 4 yards
    const absX = originAbs + dir * (point.y * yardsPerUnitDownfield);
    const svgX = yardToSvgX(Math.max(0, Math.min(100, absX)));
    // Vertical stacking: map x in [0,1] to rows around center
    const baseY = 300; // tilt offense a bit lower on screen
    const lateralScalePx = 260; // spread formation vertically a bit more
    const svgY = baseY + (point.x - 0.5) * lateralScalePx;
    return { x: svgX, y: svgY };
  }

  // Draw all offense and defense players at start positions
  const offenseRoles = new Set(['left_tackle','left_guard','center','right_guard','right_tackle','tight_end_right','tight_end_left','wide_receiver_left','wide_receiver_right','slot_left','slot_right','quarterback','fullback','halfback']);
  const defenseRoles = new Set(['defensive_tackle','defensive_end','nose_tackle','linebacker','mike','sam','will','cornerback_left','cornerback_right','nickel','safety_free','safety_strong']);
  const nodes = {};
  function placeEntity(ent, isDefenseGroup) {
    const isOffense = offenseRoles.has(ent.role);
    const isDefense = defenseRoles.has(ent.role) || String(ent.role||'').startsWith('defense_') || String(ent.role||'').startsWith('cb_') || String(ent.role||'').startsWith('safety_') || isDefenseGroup;
    const p = normToSvg(ent.start);
    let node;
    if (isOffense) node = drawOffenseCircle(p.x, p.y, ent.role === 'quarterback' ? 10 : 9);
    if (!node && isDefense) node = drawDefenseX(p.x, p.y, 10);
    if (node) {
      node.setAttribute('data-id', ent.id);
      if (ent.role) node.setAttribute('data-role', ent.role);
      nodes[ent.id] = node;
      playArtSvg.appendChild(node);
      try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'node', id: ent.id, role: ent.role, startNorm: ent.start, startSvg: p }); } catch {}
    }
  }
  let qbNode = null;
  for (const ent of entities) {
    placeEntity(ent, false);
    if (ent.id === 'QB' && nodes['QB']) qbNode = nodes['QB'];
  }
  // Optionally place defense from separate defense definition
  if (defDefense && defDefense.play_art && defDefense.play_art.animation_blueprint) {
    const defEntities = defDefense.play_art.animation_blueprint.entities || [];
    for (const ent of defEntities) placeEntity(ent, true);
    // Simple defense heuristic motion based on defense label
    try {
      const label = (defDefense.label || '').toLowerCase();
      const moveDefs = [];
      const pushYards = (labs) => {
        const delta = (labs.includes('blitz')) ? 5 : (labs.includes('goal line') || labs.includes('short yard')) ? 2 : 0;
        return delta;
      };
      const backYards = (labs) => {
        const delta = (labs.includes('prevent') || labs.includes('passing')) ? 3 : 0;
        return delta;
      };
      const rush = pushYards(label);
      const back = backYards(label);
      if (rush > 0 || back > 0) {
        const NS = 'http://www.w3.org/2000/svg';
        for (const [id, node] of Object.entries(nodes)) {
          const role = (node.getAttribute && node.getAttribute('data-role')) || '';
          const isDB = /corner|nickel|safety/i.test(role);
          const isFront = /defensive_|tackle|end|nose|linebacker|mike|sam|will/i.test(role);
          let yards = 0;
          if (back > 0 && isDB) yards = back;
          if (rush > 0 && isFront) yards = rush;
          if (!yards) continue;
          // Build a tiny path along field X
          const bbox = node.getBBox();
          const currX = bbox.x + bbox.width / 2;
          const currY = bbox.y + bbox.height / 2;
          const deltaAbs = (-dir) * yards; // DBs backpedal away from LOS; rushers push toward LOS
          const endAbs = originAbs + deltaAbs;
          const endX = yardToSvgX(Math.max(0, Math.min(100, endAbs)));
          const path = createSvgElement('path', { d: `M ${currX} ${currY} L ${endX} ${currY}`, class: 'playart-route' });
          const pathId = `def-${Math.floor(Math.random()*1e9)}`;
          path.id = pathId;
          playArtSvg.appendChild(path);
          const anim = document.createElementNS(NS, 'animateMotion');
          anim.setAttribute('dur', '400ms');
          anim.setAttribute('fill', 'freeze');
          const mp = document.createElementNS(NS, 'mpath');
          try { mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${pathId}`); } catch {}
          try { mp.setAttribute('href', `#${pathId}`); } catch {}
          anim.appendChild(mp);
          node.appendChild(anim);
        }
      }
    } catch {}
  }

  // Ball at QB initially
  const qb = entities.find(e => e.id === 'QB');
  const hb = entities.find(e => e.id === 'HB');
  let ballStart = qb ? normToSvg(qb.start) : { x: yardToSvgX(originAbs), y: 300 };
  const ball = drawBall(ballStart.x, ballStart.y, 6);
  playArtSvg.appendChild(ball);
  try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'ball_init', at: ballStart, hasQB: !!qb, hasHB: !!hb }); } catch {}

  // Build paths for FB insert and HB follow if present
  function pathFromNormPoints(points) {
    const pts = points.map(normToSvg);
    return drawRoute(pts);
  }

  const NS = 'http://www.w3.org/2000/svg';
  // Find timeline actions
  const timeline = bp.timeline || [];
  let fbPathEl = null;
  let hbPathEl = null;
  let lastHandoffSvg = null;
  for (const frame of timeline) {
    const actions = frame.actions || [];
    for (const act of actions) {
      if (act.type === 'lead_insert' && act.actor === 'FB' && Array.isArray(act.path)) {
        fbPathEl = pathFromNormPoints(act.path);
        fbPathEl.id = `fb-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(fbPathEl);
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'path', actor: 'FB', id: fbPathEl.id, d: fbPathEl.getAttribute('d'), points: act.path }); } catch {}
      }
      if ((act.type === 'follow' || act.type === 'handoff' || act.type === 'run') && act.actor === 'HB' && Array.isArray(act.path)) {
        // If we already have a handoff point, ensure HB path starts there to avoid a jump
        let hbPoints = act.path.slice();
        if (lastHandoffSvg) {
          hbPoints = [{ x: (0.5), y: (act.path[0] && act.path[0].y) || 0 }].concat(act.path.slice(1));
        }
        hbPathEl = pathFromNormPoints(hbPoints);
        hbPathEl.id = `hb-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(hbPathEl);
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'path', actor: 'HB', id: hbPathEl.id, d: hbPathEl.getAttribute('d'), points: act.path }); } catch {}
      }
      // Generic route rendering for receivers/DBs if present: route_points on action
      if (Array.isArray(act.route) && act.actor) {
        const routePath = pathFromNormPoints(act.route);
        routePath.id = `${act.actor.toLowerCase()}-route-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(routePath);
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'route', actor: act.actor, id: routePath.id, d: routePath.getAttribute('d') }); } catch {}
      }
      if (act.type === 'handoff' && act.from === 'QB' && act.to === 'HB' && act.handoff_point) {
        // Move ball from QB to handoff point then along HB path
        const hp = normToSvg(act.handoff_point);
        lastHandoffSvg = hp;
        const handoffPath = createSvgElement('path', { d: `M ${ballStart.x} ${ballStart.y} L ${hp.x} ${hp.y}`, class: 'playart-route' });
        handoffPath.id = `handoff-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(handoffPath);
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'handoff_path', id: handoffPath.id, d: handoffPath.getAttribute('d'), handoffPointNorm: act.handoff_point, handoffPointSvg: hp }); } catch {}
        const anim1 = document.createElementNS(NS, 'animateMotion');
        if (startDelayMs > 0) anim1.setAttribute('begin', `${startDelayMs}ms`);
        anim1.setAttribute('dur', '220ms');
        anim1.setAttribute('fill', 'freeze');
        const mp1 = document.createElementNS(NS, 'mpath');
        try { mp1.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${handoffPath.id}`); } catch {}
        try { mp1.setAttribute('href', `#${handoffPath.id}`); } catch {}
        anim1.appendChild(mp1);
        ball.appendChild(anim1);
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'anim_ball_to_handoff', beginMs: startDelayMs, durMs: 220, pathId: handoffPath.id }); } catch {}
        // Chain second motion after short delay if hb path exists
        if (hbPathEl) {
          const anim2 = document.createElementNS(NS, 'animateMotion');
          const begin = (startDelayMs / 1000) + 0.22;
          anim2.setAttribute('begin', `${begin}s`);
          anim2.setAttribute('dur', '800ms');
          anim2.setAttribute('fill', 'freeze');
          const mp2 = document.createElementNS(NS, 'mpath');
          try { mp2.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${hbPathEl.id}`); } catch {}
          try { mp2.setAttribute('href', `#${hbPathEl.id}`); } catch {}
          anim2.appendChild(mp2);
          ball.appendChild(anim2);
          try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'anim_ball_follow_hb', beginSec: begin, durMs: 800, pathId: hbPathEl.id }); } catch {}
        }
      }
      // QB drop steps -> short backward path if dataset calls drop
      if (act.type === 'drop' && act.actor === 'QB') {
        const qbStart = qb ? normToSvg(qb.start) : { x: yardToSvgX(originAbs), y: 300 };
        const dropDepthYards = 5; // 5-yard drop
        const endAbs = originAbs - dropDepthYards * (game.possession === 'player' ? 1 : -1);
        const qbEnd = { x: yardToSvgX(Math.max(0, Math.min(100, endAbs))), y: qbStart.y };
        const qbPath = createSvgElement('path', { d: `M ${qbStart.x} ${qbStart.y} L ${qbEnd.x} ${qbEnd.y}`, class: 'playart-route' });
        qbPath.id = `qb-route-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(qbPath);
        if (qbNode) {
          const anim = document.createElementNS(NS, 'animateMotion');
          anim.setAttribute('dur', '300ms');
          anim.setAttribute('fill', 'freeze');
          const mp = document.createElementNS(NS, 'mpath');
          try { mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${qbPath.id}`); } catch {}
          try { mp.setAttribute('href', `#${qbPath.id}`); } catch {}
          anim.appendChild(mp);
          qbNode.appendChild(anim);
        }
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'qb_drop', pathId: qbPath.id }); } catch {}
      }
      // Throw: animate ball along an arc to target_point if present
      if (act.type === 'throw' && act.from === 'QB' && act.target_point) {
        const qbs = qb ? normToSvg(qb.start) : { x: yardToSvgX(originAbs), y: 300 };
        const tgt = normToSvg(act.target_point);
        const arc = createSvgElement('path', { d: `M ${qbs.x} ${qbs.y} Q ${(qbs.x + tgt.x) / 2} ${qbs.y - 120} ${tgt.x} ${tgt.y}`, class: 'playart-route' });
        arc.id = `ball-arc-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(arc);
        const anim = document.createElementNS(NS, 'animateMotion');
        anim.setAttribute('begin', `${(startDelayMs + 350) / 1000}s`);
        anim.setAttribute('dur', '500ms');
        anim.setAttribute('fill', 'freeze');
        const mp = document.createElementNS(NS, 'mpath');
        try { mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${arc.id}`); } catch {}
        try { mp.setAttribute('href', `#${arc.id}`); } catch {}
        anim.appendChild(mp);
        ball.appendChild(anim);
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'throw', arcId: arc.id, beginMs: startDelayMs + 350 }); } catch {}
      }
    }
  }

  // Optionally animate FB along insert path
  const fbNode = nodes['FB'];
  if (fbNode && fbPathEl) {
    const anim = document.createElementNS(NS, 'animateMotion');
    if (startDelayMs > 0) anim.setAttribute('begin', `${startDelayMs}ms`);
    anim.setAttribute('dur', '800ms');
    anim.setAttribute('fill', 'freeze');
    const mp = document.createElementNS(NS, 'mpath');
    try { mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${fbPathEl.id}`); } catch {}
    try { mp.setAttribute('href', `#${fbPathEl.id}`); } catch {}
    anim.appendChild(mp);
    fbNode.appendChild(anim);
    try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'anim_fb', beginMs: startDelayMs, durMs: 800, pathId: fbPathEl.id }); } catch {}
  }

  // Animate HB along his path even if no explicit handoff action created the ball animation
  const hbNode = nodes['HB'];
  if (hbNode && hbPathEl) {
    const anim = document.createElementNS(NS, 'animateMotion');
    // Start HB at handoff time (220ms) so ball and HB are in sync
    const hbBeginMs = startDelayMs + 220;
    anim.setAttribute('begin', `${hbBeginMs}ms`);
    anim.setAttribute('dur', '800ms');
    anim.setAttribute('fill', 'freeze');
    const mp = document.createElementNS(NS, 'mpath');
    try { mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${hbPathEl.id}`); } catch {}
    try { mp.setAttribute('href', `#${hbPathEl.id}`); } catch {}
    anim.appendChild(mp);
    hbNode.appendChild(anim);
    try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'anim_hb', beginMs: hbBeginMs, durMs: 800, pathId: hbPathEl.id }); } catch {}
  }

  // Keep only offense; no defense visuals for this JSON render
  scheduleCleanup(2200 + startDelayMs);
  if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'scheduled_cleanup', atMs: 2200 + startDelayMs });
  // Toast to confirm it triggered
  showToast('Animating: Power Up Middle');
}

function showToast(text) {
  const overlay = document.getElementById('vfx-overlay');
  if (!overlay) return;
  const d = document.createElement('div');
  d.className = 'vfx-toast';
  d.textContent = text;
  overlay.appendChild(d);
  setTimeout(() => { d.remove(); }, 1500);
}

function log(msg) {
  logElement.textContent += msg + '\n';
  logElement.scrollTop = logElement.scrollHeight;
}

function logClear() {
  logElement.textContent = '';
}

function mapCardIdToAnimId(cardId) {
  if (!cardId) return '';
  // Convert camel segments to underscores, then uppercase
  return String(cardId)
    .replace(/\s+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

// Initialise UI on first load
document.addEventListener('DOMContentLoaded', async () => {
  // Build the field graphic once the DOM is ready.
  initField();
  // Load JSON data tables (non-fatal if missing)
  await loadDataTables();
  await loadPlayArtData();
  await loadPlayArtDataset();
  // Load animator module and animations data
  try {
    // Prefer preloaded module (index.html)
    GSAnimator = window.GSAnimator || GSAnimator;
    if (!GSAnimator) {
      const mod = await import('./scripts/gs_animator.js');
      GSAnimator = mod;
    }
    try { await GSAnimator.loadPlays('play_art_animations_autogen_min.json'); } catch {}
    try { GSAnimator.initField(fieldDisplay, { showDebug: false }); } catch {}
    // Wire animation events to log
    GSAnimator.on('snap', () => log('[anim] Snap.'));
    GSAnimator.on('handoff', () => log('[anim] Handoff.'));
    GSAnimator.on('throw', () => log('[anim] Throw.'));
    GSAnimator.on('catch', () => log('[anim] Catch.'));
    GSAnimator.on('drop', () => log('[anim] Drop.'));
    GSAnimator.on('intercept', () => log('[anim] Interception!'));
    GSAnimator.on('tackle', () => log('[anim] Tackle.'));
    GSAnimator.on('whistle', () => log('[anim] Whistle.'));
    GSAnimator.on('result', (r) => {
      if (!r) return;
      const y = Math.round(r.gainedYards || 0);
      log(`[anim] Result: ${y >= 0 ? 'Gain' : 'Loss'} of ${Math.abs(y)}.`);
    });
    // Test hook
    window.animateTest = function(offensePlayId, defenseCard, ballOnYard, yardsToGo, down, seed) {
      if (!GSAnimator) return;
      return GSAnimator.animatePlay({ offensePlayId, defenseCard, ballOnYard, yardsToGo, down, seed });
    };
  } catch (e) {
    try { console.warn('Animator module failed to load:', e); } catch {}
  }
  // Normalise initial scoreboard labels to HOME/AWAY to match HUD updates.
  if (scoreDisplay) scoreDisplay.textContent = 'HOME 0 — AWAY 0';
  if (hudPossession) hudPossession.textContent = 'HOME';
  updateHUD();
  // Emit initial snapshot for debug
  try {
    if (window.debug && window.debug.enabled) window.debug.event('snapshot', { action: 'init', state: { q: game.quarter, clk: game.clock, d: game.down, toGo: game.toGo, ballOn: game.ballOn, poss: game.possession, score: { ...game.score } } });
  } catch {}
  // Wire UI state capture for dropdowns and inputs
  const captureSelect = (el, id) => {
    if (!el) return;
    const emit = () => { if (window.debug && window.debug.enabled) window.debug.event('ui', { action: 'select', id, value: el.value }); };
    try { emit(); } catch {}
    el.addEventListener('change', emit);
  };
  const captureInput = (el, id) => {
    if (!el) return;
    const emit = () => { if (window.debug && window.debug.enabled) window.debug.event('ui', { action: 'input', id, value: el.type === 'checkbox' ? !!el.checked : el.value }); };
    try { emit(); } catch {}
    el.addEventListener('change', emit);
    if (el.type !== 'checkbox') el.addEventListener('input', emit);
  };
  captureSelect(deckSelect, 'deck-select');
  captureSelect(opponentSelect, 'opponent-select');
  captureSelect(document.getElementById('test-player-deck'), 'test-player-deck');
  captureSelect(document.getElementById('test-ai-deck'), 'test-ai-deck');
  captureSelect(document.getElementById('test-possession'), 'test-possession');
  captureInput(document.getElementById('test-ballon'), 'test-ballon');
  captureSelect(document.getElementById('test-down'), 'test-down');
  captureInput(document.getElementById('test-togo'), 'test-togo');
  captureSelect(document.getElementById('test-quarter'), 'test-quarter');
  captureInput(document.getElementById('test-clock'), 'test-clock');
  captureSelect(document.getElementById('theme-select'), 'theme-select');
  captureInput(document.getElementById('sfx-enabled'), 'sfx-enabled');
  captureInput(document.getElementById('sfx-volume'), 'sfx-volume');
  captureInput(document.getElementById('dev-mode-checkbox'), 'dev-mode-checkbox');
});

// -----------------------------------------------------------------------------
// Headless simulation helpers for automated validation and testing
// -----------------------------------------------------------------------------

// Choose a card for the HOME side (player) during simulation without UI.
function choosePlayerCardForSimulation() {
  if (game.possession === 'player') {
    const deck = OFFENSE_DECKS[game.offenseDeck] || [];
    return deck[Math.floor(Math.random() * deck.length)];
  } else {
    return DEFENSE_DECK[Math.floor(Math.random() * DEFENSE_DECK.length)];
  }
}

// Run a single simulated snap without UI.
function simulateTick() {
  if (game.gameOver) return;
  // Auto-resolve PATs in simulation mode
  if (game.awaitingPAT) {
    if (game.simulationMode) {
      const diff = game.score.ai - game.score.player;
      if (diff === 1 || diff === 2) attemptTwoPoint(); else attemptExtraPoint();
      return;
    }
    return;
  }
  // Player 4th-down decision similar to AI
  if (game.possession === 'player' && game.down === 4) {
    if (game.toGo > 1) {
      const distance = 100 - game.ballOn;
      if (distance <= 45) {
        attemptFieldGoal();
        return;
      } else {
        const punts = (OFFENSE_DECKS[game.offenseDeck] || []).filter((c) => c.type === 'punt');
        if (punts.length > 0) {
          const playerCard = punts[0];
          const aiCard = aiChooseCard();
          resolvePlay(playerCard, aiCard);
          return;
        }
      }
      // Fallback run path if no HB path defined and we have outcome yards
      if (!hbPathEl && (act.type === 'handoff' || act.type === 'run') && outcome && typeof outcome.yards === 'number') {
        const start = lastHandoffSvg || (hb ? normToSvg(hb.start) : { x: yardToSvgX(originAbs), y: 300 });
        const endAbs = originAbs + dir * outcome.yards;
        const end = { x: yardToSvgX(Math.max(0, Math.min(100, endAbs))), y: start.y };
        const path = createSvgElement('path', { d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`, class: 'playart-route' });
        path.id = `hb-fallback-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(path);
        hbPathEl = path;
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'path_fallback_hb', id: path.id, d: path.getAttribute('d'), yards: outcome.yards }); } catch {}
      }
      // QB drop steps -> short backward path if dataset calls drop
      if (act.type === 'drop' && act.actor === 'QB') {
        const qbStart = qb ? normToSvg(qb.start) : { x: yardToSvgX(originAbs), y: 300 };
        const dropDepthYards = 5; // 5-yard drop
        const endAbs = originAbs - dropDepthYards * (game.possession === 'player' ? 1 : -1);
        const qbEnd = { x: yardToSvgX(Math.max(0, Math.min(100, endAbs))), y: qbStart.y };
        const qbPath = createSvgElement('path', { d: `M ${qbStart.x} ${qbStart.y} L ${qbEnd.x} ${qbEnd.y}`, class: 'playart-route' });
        qbPath.id = `qb-route-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(qbPath);
        if (qbNode) {
          const anim = document.createElementNS(NS, 'animateMotion');
          anim.setAttribute('dur', '300ms');
          anim.setAttribute('fill', 'freeze');
          const mp = document.createElementNS(NS, 'mpath');
          try { mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${qbPath.id}`); } catch {}
          try { mp.setAttribute('href', `#${qbPath.id}`); } catch {}
          anim.appendChild(mp);
          qbNode.appendChild(anim);
        }
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'qb_drop', pathId: qbPath.id }); } catch {}
      }
      // Throw: animate ball along an arc to target_point if present
      if (act.type === 'throw' && act.from === 'QB' && act.target_point) {
        const qbs = qb ? normToSvg(qb.start) : { x: yardToSvgX(originAbs), y: 300 };
        const tgt = normToSvg(act.target_point);
        const arc = createSvgElement('path', { d: `M ${qbs.x} ${qbs.y} Q ${(qbs.x + tgt.x) / 2} ${qbs.y - 120} ${tgt.x} ${tgt.y}`, class: 'playart-route' });
        arc.id = `ball-arc-${Math.floor(Math.random()*1e9)}`;
        playArtSvg.appendChild(arc);
        const anim = document.createElementNS(NS, 'animateMotion');
        anim.setAttribute('begin', `${(startDelayMs + 350) / 1000}s`);
        anim.setAttribute('dur', '500ms');
        anim.setAttribute('fill', 'freeze');
        const mp = document.createElementNS(NS, 'mpath');
        try { mp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${arc.id}`); } catch {}
        try { mp.setAttribute('href', `#${arc.id}`); } catch {}
        anim.appendChild(mp);
        ball.appendChild(anim);
        try { if (window.debug && window.debug.enabled) window.debug.event('anim', { action: 'throw', arcId: arc.id, beginMs: startDelayMs + 350 }); } catch {}
      }
    }
  }
  // Normal snap
  let playerCard = choosePlayerCardForSimulation();
  // In simulation/dev runs, avoid punting on downs 1-3 unless explicitly testing
  if (game.down < 4 && playerCard && playerCard.type === 'punt') {
    const deck = OFFENSE_DECKS[game.offenseDeck] || [];
    const alternatives = deck.filter((c) => c.type !== 'punt');
    if (alternatives.length) playerCard = alternatives[Math.floor(Math.random() * alternatives.length)];
  }
  const aiCard = aiChooseCard();
  if (game.possession === 'ai' && aiCard && aiCard.type === 'field-goal') {
    attemptFieldGoal();
    return;
  }
  resolvePlay(playerCard, aiCard);
}

// Simulate a full game quickly. Returns { home, away, winner }
function simulateOneGame(options = {}) {
  const { playerPAT = 'kick' } = options;
  game.simulationMode = true;
  startNewGame();
  let snaps = 0;
  const maxSnaps = 1200;
  while (!game.gameOver && snaps < maxSnaps) {
    snaps++;
    if (game.awaitingPAT) {
      if (playerPAT === 'two') attemptTwoPoint();
      else if (playerPAT === 'auto') {
        const diff = game.score.ai - game.score.player;
        if (diff === 1 || diff === 2) attemptTwoPoint(); else attemptExtraPoint();
      } else {
        attemptExtraPoint();
      }
      continue;
    }
    simulateTick();
  }
  game.simulationMode = false;
  return {
    home: game.score.player,
    away: game.score.ai,
    winner: game.score.player === game.score.ai ? 'tie' : (game.score.player > game.score.ai ? 'home' : 'away')
  };
}

// Run N games and summarize outcomes. Exposed on window.
function simulateGames(options = {}) {
  const { numGames = 100, playerPAT = 'kick', logEachGame = false, suppressUI = true } = options;
  // Clamp number of games to 1..100
  const total = Math.min(100, Math.max(1, numGames));
  // Temporarily suppress UI-heavy functions
  const saved = { log, updateHUD, dealHands, updateFGOptions, showCardOverlay };
  if (suppressUI) {
    log = function() {};
    updateHUD = function() {};
    dealHands = function() {};
    updateFGOptions = function() {};
    showCardOverlay = function() {};
  }
  const summary = { games: 0, homeWins: 0, awayWins: 0, ties: 0, totalHome: 0, totalAway: 0 };
  for (let i = 0; i < total; i++) {
    const res = simulateOneGame({ playerPAT });
    summary.games++;
    summary.totalHome += res.home;
    summary.totalAway += res.away;
    if (res.winner === 'home') summary.homeWins++; else if (res.winner === 'away') summary.awayWins++; else summary.ties++;
    if (logEachGame && saved.log) {
      try { saved.log(`Sim ${i + 1}: HOME ${res.home} — AWAY ${res.away} (${res.winner})`); } catch {}
    }
  }
  // Restore
  if (suppressUI) {
    log = saved.log;
    updateHUD = saved.updateHUD;
    dealHands = saved.dealHands;
    updateFGOptions = saved.updateFGOptions;
    showCardOverlay = saved.showCardOverlay;
  }
  const report = {
    games: summary.games,
    homeWins: summary.homeWins,
    awayWins: summary.awayWins,
    ties: summary.ties,
    avgHome: Number((summary.totalHome / summary.games).toFixed(2)),
    avgAway: Number((summary.totalAway / summary.games).toFixed(2))
  };
  if (typeof window !== 'undefined') window.lastSimulationSummary = report;
  if (typeof console !== 'undefined') console.log('Simulation Summary:', report);
  return report;
}

if (typeof window !== 'undefined') {
  window.simulateTick = simulateTick;
  window.simulateOneGame = simulateOneGame;
  window.simulateGames = simulateGames;
}

// Format richer penalty narration matching the GDD phrasing.
function formatPenaltyNarration(onWho, yards, automaticFirstDown, offenseTeamName) {
  const teamOffense = offenseTeamName === 'HOME' ? 'HOME' : 'AWAY';
  const teamDefense = teamOffense === 'HOME' ? 'AWAY' : 'HOME';
  const team = onWho === 'offense' ? `${teamOffense} offense` : `${teamDefense} defense`;
  let foul;
  if (yards >= 15) foul = 'Personal foul';
  else if (yards === 10) foul = 'Holding';
  else foul = onWho === 'offense' ? 'False start' : 'Offside';
  const spot = 'from the line of scrimmage';
  const afd = automaticFirstDown ? ', automatic first down' : '';
  return `${foul} on ${team}, ${yards}-yard penalty ${spot}${afd}.`;
}

// Compute accept/decline outcomes for a penalty relative to the original LOS
// and present a modal for the player or choose for the AI.
function handlePenaltyDecision(ctx) {
  const { penalty, yards, preBallOn, preDown, preToGo, teamName } = ctx;
  // Determine on-field directions
  const offenseIsPlayer = game.possession === 'player';
  const offenseTeamName = offenseIsPlayer ? 'HOME' : 'AWAY';
  const defenseTeamName = offenseIsPlayer ? 'AWAY' : 'HOME';

  // Decline outcome: keep original result from charts
  const declineBallOn = (function() {
    if (offenseIsPlayer) return preBallOn + yards;
    return preBallOn - yards;
  })();
  const declineClamped = Math.max(0, Math.min(100, declineBallOn));
  const declineTarget = offenseIsPlayer ? preBallOn + preToGo : preBallOn - preToGo;
  const declineDist = Math.round(Math.abs(declineTarget - declineClamped));
  let declineDown = preDown + 1;
  let declineToGo;
  if (declineDist <= 0) {
    // Achieved the line to gain on the play; next series starts 1st & 10
    declineDown = 1;
    declineToGo = 10;
  } else {
    declineToGo = declineDist;
  }

  // Accept outcome: enforce penalty from previous spot with automatic first down if given.
  let acceptBallOn = preBallOn;
  if (penalty.on === 'offense') {
    // Move toward own goal: subtract for player offense, add for AI offense
    const delta = Math.min(penalty.yards, Math.floor((offenseIsPlayer ? preBallOn : 100 - preBallOn) / 2));
    acceptBallOn = offenseIsPlayer ? preBallOn - delta : preBallOn + delta;
  } else {
    // Defense penalty moves toward opponent goal
    const delta = Math.min(penalty.yards, Math.floor((offenseIsPlayer ? 100 - preBallOn : preBallOn) / 2));
    acceptBallOn = offenseIsPlayer ? preBallOn + delta : preBallOn - delta;
  }
  acceptBallOn = Math.max(0, Math.min(100, acceptBallOn));
  let acceptDown = preDown; // repeat down unless automatic first down
  let acceptToGo;
  if (penalty.on === 'defense' && penalty.firstDown) {
    acceptDown = 1;
    acceptToGo = 10;
  } else {
    // Recompute distance to original line to gain
    const target = offenseIsPlayer ? preBallOn + preToGo : preBallOn - preToGo;
    const newDist = Math.round(Math.abs(target - acceptBallOn));
    if (newDist <= 0) {
      acceptDown = 1;
      acceptToGo = 10;
    } else {
      acceptToGo = Math.max(1, newDist);
    }
  }

  // Decision maker is ALWAYS the non-penalized team.
  const deciderIsPlayer = penalty.on === 'offense' ? !offenseIsPlayer : offenseIsPlayer;
  // If simulation mode is active, auto-decide without UI even when the player would decide.
  if (game.simulationMode) {
    const deciderIsOffense = penalty.on === 'defense';
    const aiAccepts = decidePenaltyAI({
      penalty,
      acceptBallOn,
      acceptDown,
      acceptToGo,
      declineBallOn: declineClamped,
      declineDown,
      declineToGo,
      preDown,
      preToGo,
      aiIsOffense: deciderIsOffense,
      offenseIsPlayer
    });
    applyPenaltyDecision(aiAccepts ? 'accept' : 'decline', {
      acceptBallOn, acceptDown, acceptToGo, declineBallOn: declineClamped, declineDown, declineToGo
    });
    return;
  }
  // If AI decides (either on offense for defensive penalty or on defense for offensive penalty)
  if (!deciderIsPlayer) {
    const aiAccepts = decidePenaltyAI({
      penalty,
      acceptBallOn,
      acceptDown,
      acceptToGo,
      declineBallOn: declineClamped,
      declineDown,
      declineToGo,
      preDown,
      preToGo,
      aiIsOffense: !offenseIsPlayer,
      offenseIsPlayer
    });
    applyPenaltyDecision(aiAccepts ? 'accept' : 'decline', {
      acceptBallOn, acceptDown, acceptToGo, declineBallOn: declineClamped, declineDown, declineToGo
    });
    return;
  }

  // Player decides: show modal
  const textEl = document.getElementById('penalty-text');
  if (!penaltyModal || !textEl) {
    // Fallback: default to accept
    applyPenaltyDecision('accept', { acceptBallOn, acceptDown, acceptToGo, declineBallOn: declineClamped, declineDown, declineToGo });
    return;
  }
  // Guard UI while the modal is open
  game.overlayActive = true;
  const foulText = formatPenaltyNarration(penalty.on, penalty.yards, penalty.firstDown === true, offenseTeamName);
  const acceptDesc = `${offenseTeamName} at ${formatYardForLog(acceptBallOn)}, ${['1st','2nd','3rd','4th'][acceptDown-1] || acceptDown+'th'} & ${acceptToGo}`;
  const declineDesc = `${offenseTeamName} at ${formatYardForLog(declineClamped)}, ${['1st','2nd','3rd','4th'][declineDown-1] || declineDown+'th'} & ${declineToGo}`;
  textEl.textContent = `${foulText}\nAccept: ${acceptDesc}\nDecline: ${declineDesc}`;
  penaltyModal.style.display = 'block';

  // Clean previous listeners
  penaltyAcceptBtn.onclick = null;
  penaltyDeclineBtn.onclick = null;
  penaltyAcceptBtn.onclick = () => {
    penaltyModal.style.display = 'none';
    game.overlayActive = false;
    applyPenaltyDecision('accept', { acceptBallOn, acceptDown, acceptToGo, declineBallOn: declineClamped, declineDown, declineToGo });
  };
  penaltyDeclineBtn.onclick = () => {
    penaltyModal.style.display = 'none';
    game.overlayActive = false;
    applyPenaltyDecision('decline', { acceptBallOn, acceptDown, acceptToGo, declineBallOn: declineClamped, declineDown, declineToGo });
  };
}

function decidePenaltyAI({ penalty, acceptBallOn, acceptDown, acceptToGo, declineBallOn, declineDown, declineToGo, preDown, preToGo, aiIsOffense, offenseIsPlayer }) {
  // Heuristic: the deciding team is ALWAYS the non-penalized team.
  // If AI is on offense, it wants to advance toward its goal (AI toward 0).
  // If AI is on defense, it wants the opponent farther from 100 (HOME goal at 0).
  function score(ballOn, down, toGo) {
    let s = 0;
    if (aiIsOffense) {
      // Favor being closer to player's goal line (lower ballOn)
      s -= ballOn * 0.25;
      if (down === 1 && toGo === 10 && (preDown !== 1 || preToGo !== 10)) s += 50;
      s -= Math.max(0, toGo - 3) * 2;
      s -= (down - 1) * 5;
    } else {
      // AI is on defense deciding a penalty on the offense.
      // Favor worse field position for the opponent (higher ballOn for player offense, lower for AI offense)
      // Since ballOn is absolute from HOME goal, when the opponent is HOME offense prefer lower ballOn; when opponent is AI offense prefer higher.
      const opponentIsHomeOffense = offenseIsPlayer; // player is HOME
      const oppField = opponentIsHomeOffense ? ballOn : 100 - ballOn;
      s += oppField * 0.25; // larger is better for defense (push them back)
      // Prefer longer to-go and later downs
      s += Math.max(0, toGo - 3) * 2;
      s += (down - 1) * 5;
    }
    return s;
  }
  const acceptScore = score(acceptBallOn, acceptDown, acceptToGo);
  const declineScore = score(declineBallOn, declineDown, declineToGo);
  return acceptScore >= declineScore;
}

function applyPenaltyDecision(choice, st) {
  const { acceptBallOn, acceptDown, acceptToGo, declineBallOn, declineDown, declineToGo } = st;
  const offenseIsPlayer = game.possession === 'player';
  const chosenBallOn = choice === 'accept' ? acceptBallOn : declineBallOn;
  const chosenDown = choice === 'accept' ? acceptDown : declineDown;
  const chosenToGo = choice === 'accept' ? acceptToGo : declineToGo;
  game.ballOn = chosenBallOn;
  game.down = chosenDown;
  game.toGo = chosenToGo;
  // Narrate decision
  log(choice === 'accept' ? 'Penalty accepted.' : 'Penalty declined.');
  // Time off for a penalty play (accept or decline consumes the play)
  game.clock -= TIME_KEEPING.penalty;
  checkTwoMinuteWarning();
  // A half may not end on a penalty: if time expired as a result of this
  // penalty administration, schedule an untimed down.
  if (game.clock <= 0 && !game.gameOver) {
    game.pendingUntimedDown = true;
  }
  handleClockAndQuarter();
  updateHUD();
  dealHands();
}

const vfxOverlay = document.getElementById('vfx-overlay');

function vfxBanner(text, style) {
  if (!vfxOverlay) return;
  const el = document.createElement('div');
  el.className = 'vfx-banner' + (style === 'gold' ? ' vfx-banner--gold' : '');
  el.textContent = text;
  vfxOverlay.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

function vfxFlash() {
  if (!vfxOverlay) return;
  const el = document.createElement('div');
  el.className = 'vfx-flash';
  vfxOverlay.appendChild(el);
  setTimeout(() => el.remove(), 450);
}

function vfxParticles(x, y, count, gold) {
  if (!vfxOverlay) return;
  const rect = vfxOverlay.getBoundingClientRect();
  const baseX = typeof x === 'number' ? x : rect.width / 2;
  const baseY = typeof y === 'number' ? y : rect.height * 0.25;
  const n = Math.max(6, Math.min(30, count || 12));
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'vfx-particle' + (gold ? ' gold' : '');
    const dx = (Math.random() - 0.5) * 300;
    const dy = (Math.random() - 0.5) * 40;
    p.style.left = `${baseX + dx}px`;
    p.style.top = `${baseY + dy}px`;
    vfxOverlay.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

function vfxShake(element) {
  if (!element) return;
  element.classList.remove('shake');
  // force reflow to restart animation
  void element.offsetWidth;
  element.classList.add('shake');
}

// Add: Theme change banner helper and transition wiring
function vfxBanner(text, options) {
  if (!vfxOverlay) return;
  const opts = options || {};
  const el = document.createElement('div');
  el.className = 'vfx-banner' + (opts.gold ? ' vfx-banner--gold' : '');
  el.textContent = text;
  vfxOverlay.appendChild(el);
  const ttl = typeof opts.ttlMs === 'number' ? opts.ttlMs : 1400;
  setTimeout(() => { el.remove(); }, ttl);
}

function showThemeTransition(themeName) {
  // Pick banner wording and VFX accent by theme
  const t = (themeName || '').toLowerCase();
  let label = 'THEME UPDATED';
  let gold = false;
  switch (t) {
    case 'arcade':
      label = 'ARCADE THEME';
      gold = true;
      vfxParticles(undefined, undefined, 22, true);
      break;
    case 'retro':
      label = 'RETRO ARCADE';
      vfxParticles(undefined, undefined, 16, false);
      break;
    case 'board':
      label = 'BOARD GAME THEME';
      break;
    case 'vintage':
      label = 'VINTAGE NFL';
      break;
    case 'modern':
      label = 'MODERN NFL';
      gold = true;
      break;
    case 'minimalist':
      label = 'MINIMAL THEME';
      break;
  }
  vfxBanner(label, { gold, ttlMs: 1500 });
  if (typeof SFX !== 'undefined' && SFX && SFX.onThemeChange) {
    SFX.onThemeChange(t);
  }
}

// DEV MODE wiring and Theme/SFX managers
const devCheckbox = document.getElementById('dev-mode-checkbox');
const controlsNormal = document.getElementById('controls-normal');
const controlsTest = document.getElementById('controls-test');
const themeSelect = document.getElementById('theme-select');
const sfxEnabledInput = document.getElementById('sfx-enabled');
const sfxVolumeInput = document.getElementById('sfx-volume');

const ThemeManager = (() => {
  const STORAGE_KEY = 'gs_theme_v1';
  function applyTheme(theme) {
    const t = theme || 'arcade';
    document.body.setAttribute('data-theme', t);
  }
  function setTheme(theme) {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }
  function init() {
    let t = 'arcade';
    try { t = localStorage.getItem(STORAGE_KEY) || t; } catch {}
    applyTheme(t);
    if (themeSelect) themeSelect.value = t;
  }
  return { setTheme, init };
})();

const SFX = (() => {
  let audioCtx;
  let masterGain;
  let enabled = true;
  let volume = 0.6;
  let theme = 'arcade';
  function ensureContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioCtx.destination);
    }
  }
  function setEnabled(v) { enabled = !!v; }
  function setVolume(v) { volume = v; if (masterGain) masterGain.gain.value = volume; }
  function setThemeName(t) { theme = t; }

  function createDistortion(amount) {
    const k = typeof amount === 'number' ? amount : 20;
    const n = 44100;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    const ws = audioCtx.createWaveShaper();
    ws.curve = curve;
    ws.oversample = '4x';
    return ws;
  }

  function createDelay(ms, feedbackGain) {
    const delay = audioCtx.createDelay(1.0);
    delay.delayTime.value = Math.min(0.5, Math.max(0, (ms || 90) / 1000));
    const fb = audioCtx.createGain();
    fb.gain.value = Math.min(0.6, Math.max(0, feedbackGain == null ? 0.25 : feedbackGain));
    delay.connect(fb).connect(delay);
    return { delay, fb };
  }

  function beep(freq, dur, type) {
    if (!enabled) return;
    ensureContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || (theme === 'board' ? 'sine' : 'square');
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;
    let chain = gain;
    if (theme === 'arcade') {
      // Light distortion + slapback delay for punch
      const dist = createDistortion(35);
      const { delay } = createDelay(80, 0.18);
      osc.connect(dist).connect(delay).connect(gain).connect(masterGain);
    } else {
      osc.connect(gain).connect(masterGain);
    }
    const now = audioCtx.currentTime;
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  function glide(freqStart, freqEnd, dur, type, gainMul) {
    if (!enabled) return;
    ensureContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sawtooth';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + dur);
    gain.gain.value = 0.0001;
    const target = Math.max(0.05, (gainMul || 0.7) * volume);
    gain.gain.exponentialRampToValueAtTime(target, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    let node = osc;
    if (theme === 'arcade') node = node.connect(createDistortion(25));
    node.connect(gain).connect(masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  function noiseCrowd(dur) {
    if (!enabled) return;
    ensureContext();
    const bufferSize = 2 * audioCtx.sampleRate * dur;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = theme === 'modern' ? 1200 : theme === 'retro' ? 900 : 800;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.0001;
    let chain = noise.connect(filter);
    if (theme === 'arcade') {
      const { delay } = createDelay(120, 0.12);
      chain = chain.connect(delay);
    }
    chain.connect(gain).connect(masterGain);
    const now = audioCtx.currentTime;
    gain.gain.exponentialRampToValueAtTime(volume * 0.75, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noise.start(now);
    noise.stop(now + dur + 0.05);
  }

  function noiseBurst(dur) {
    if (!enabled) return;
    ensureContext();
    const bufferSize = Math.floor(audioCtx.sampleRate * (dur || 0.12));
    const buf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const hp = audioCtx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 600;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.0001;
    let chain = src.connect(hp);
    if (theme === 'arcade') chain = chain.connect(createDistortion(45));
    chain.connect(gain).connect(masterGain);
    const now = audioCtx.currentTime;
    gain.gain.exponentialRampToValueAtTime(volume * 0.8, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.12));
    src.start(now);
    src.stop(now + (dur || 0.12) + 0.02);
  }

  // Theme change sting
  function onThemeChange(name) {
    const t = (name || theme || 'arcade').toLowerCase();
    if (!enabled) return;
    ensureContext();
    switch (t) {
      case 'arcade':
        beep(660, 0.08, 'square');
        setTimeout(() => beep(880, 0.09, 'square'), 50);
        setTimeout(() => noiseBurst(0.08), 70);
        break;
      case 'retro':
        beep(523.25, 0.08, 'square');
        setTimeout(() => beep(659.25, 0.08, 'square'), 60);
        break;
      case 'board':
        beep(392.00, 0.1, 'sine');
        setTimeout(() => beep(523.25, 0.1, 'sine'), 80);
        break;
      case 'vintage':
        glide(700, 300, 0.16, 'triangle', 0.6);
        break;
      case 'modern':
        glide(1200, 500, 0.14, 'sawtooth', 0.7);
        break;
      case 'minimalist':
        beep(720, 0.06, 'sine');
        break;
      default:
        beep(660, 0.06);
    }
  }

  // Public event hooks
  function onTouchdown() {
    if (theme === 'arcade') {
      // Layered triad with sub punch and short arpeggio
      beep(440, 0.11, 'square');
      setTimeout(() => beep(660, 0.12, 'square'), 40);
      setTimeout(() => beep(880, 0.14, 'square'), 80);
      // Sub drop and snare-like burst
      glide(300, 90, 0.22, 'sawtooth', 0.9);
      setTimeout(() => noiseBurst(0.1), 60);
    } else if (theme === 'retro') {
      beep(440, 0.1); beep(660, 0.12); beep(880, 0.14);
    } else if (theme === 'board') {
      beep(523.25, 0.12, 'sine'); beep(659.25, 0.12, 'sine');
    } else if (theme === 'vintage') {
      beep(392, 0.12, 'triangle'); beep(523.25, 0.12, 'triangle');
    } else if (theme === 'modern' || theme === 'minimalist') {
      glide(1500, 300, 0.25, 'sawtooth', 0.8);
    }
    noiseCrowd(theme === 'arcade' ? 1.0 : 0.9);
  }

  function onFieldGoal(good) {
    if (good) {
      if (theme === 'arcade') { beep(784, 0.09, 'square'); setTimeout(() => beep(988, 0.08, 'square'), 60); }
      else if (theme === 'board') beep(659.25, 0.09, 'sine');
      else beep(784, 0.08);
      noiseCrowd(theme === 'arcade' ? 0.7 : 0.6);
    } else {
      glide(220, 120, 0.22, 'sawtooth', 0.7);
    }
  }

  function onPAT(good) { onFieldGoal(good); }

  function onSack() {
    if (theme === 'arcade') {
      glide(250, 80, 0.18, 'sawtooth', 0.9); noiseBurst(0.09);
    } else {
      glide(250, 120, 0.18, 'sawtooth', 0.7);
    }
  }

  function onTurnover() {
    if (theme === 'arcade') {
      glide(300, 90, 0.2, 'triangle', 0.9); setTimeout(() => noiseBurst(0.08), 40);
    } else {
      beep(180, 0.18, 'triangle');
    }
  }

  function onFirstDown() {
    if (theme === 'arcade') {
      // Quick ascending blip blip
      beep(620, 0.05, 'square'); setTimeout(() => beep(740, 0.05, 'square'), 55);
    } else if (theme === 'minimalist' || theme === 'modern') {
      glide(1200, 300, 0.12, 'sawtooth', 0.6);
    } else {
      beep(660, 0.06);
    }
  }

  return { setEnabled, setVolume, setThemeName, onThemeChange, onTouchdown, onFieldGoal, onPAT, onSack, onTurnover, onFirstDown };
})();

// Wire DEV MODE toggle and controls
if (devCheckbox) {
  const savedDev = (() => { try { return localStorage.getItem('gs_dev_mode') === '1'; } catch { return false; } })();
  devCheckbox.checked = savedDev;
  const applyDev = (on) => {
    if (controlsNormal) controlsNormal.classList.toggle('hidden', !!on);
    if (controlsTest) controlsTest.classList.toggle('hidden', !on);
    // Init debug container with trace support
    if (!window.debug) window.debug = { enabled: false, buffer: [], echoToUi: true, event(){}, traceEnabled: false, traceBuffer: [], callDepth: 0, _orig: {}, enableTrace(){}, disableTrace(){}, _wrapList: [] };
    // Implement event() to record debug events
    try {
      window.debug.event = function(kind, payload) {
        if (!this.enabled) return;
        const evt = { t: Date.now(), type: kind || 'info' };
        if (payload && typeof payload === 'object') {
          try {
            // Avoid functions/DOM nodes in payload
            const safe = JSON.parse(JSON.stringify(payload, (k, v) => (typeof v === 'function' ? `[fn:${v.name||'anon'}]` : v)));
            Object.assign(evt, safe);
          } catch {
            evt.msg = String(payload);
          }
        }
        try { this.buffer.push(evt); } catch {}
        // Cap buffer
        if (this.buffer.length > 5000) this.buffer.splice(0, this.buffer.length - 5000);
        if (this.echoToUi && typeof console !== 'undefined') {
          try { console.log('[DBG]', kind, evt); } catch {}
        }
      };
    } catch {}
    window.debug.enabled = !!on;
    // Configure tracing when DEV mode toggles
    window.debug.traceEnabled = !!on;
    // Lazy init wrappers only once
    if (!window.debug._wrappedInit) {
      window.debug._wrappedInit = true;
      window.debug._wrapList = [
        'resolvePlay','determineOutcome','parseResultString','resolveKickoff','resolveLongGain',
        'attemptExtraPoint','attemptTwoPoint','aiAttemptPAT','attemptFieldGoal','aiChooseCard',
        'choosePlayerCardForSimulation','simulateTick','simulateOneGame','kickoff','resolvePunt',
        'handlePenaltyDecision','applyPenaltyDecision','decidePenaltyAI','handleSafety',
        'handleClockAndQuarter','maybePenalty','getFormationDescription','describePlayAction',
        'updateHUD','changePossession','calculateTimeOff','formatYardForLog','updateFGOptions',
        'renderHand','playCard','renderPlayArt'
      ];
      const getGameSummary = () => ({
        q: game.quarter, clk: game.clock, d: game.down, toGo: game.toGo, ballOn: game.ballOn,
        poss: game.possession, score: { ...game.score }
      });
      const safe = (val) => {
        try { return JSON.parse(JSON.stringify(val, (k, v) => (typeof v === 'function' ? `[fn:${v.name||'anon'}]` : v))); } catch { return String(val); }
      };
      window.debug.enableTrace = function enableTrace() {
        if (!this._orig) this._orig = {};
        for (const name of this._wrapList) {
          const fn = window[name];
          if (typeof fn === 'function' && !this._orig[name]) {
            this._orig[name] = fn;
            const dbg = this;
            window[name] = function tracedFunction(...args) {
              if (!dbg.traceEnabled) return fn.apply(this, args);
              const depth = ++dbg.callDepth;
              const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
              const entry = { t: Date.now(), phase: 'enter', name, depth, args: safe(args), state: getGameSummary() };
              try { dbg.traceBuffer.push(entry); } catch {}
              try {
                const ret = fn.apply(this, args);
                const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                try { dbg.traceBuffer.push({ t: Date.now(), phase: 'return', name, depth, dt: Math.round((end - start)*1000)/1000, result: safe(ret), state: getGameSummary() }); } catch {}
                return ret;
              } catch (err) {
                const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                try { dbg.traceBuffer.push({ t: Date.now(), phase: 'throw', name, depth, dt: Math.round((end - start)*1000)/1000, error: String(err), state: getGameSummary() }); } catch {}
                throw err;
              } finally {
                dbg.callDepth = Math.max(0, dbg.callDepth - 1);
              }
            };
          }
        }
      };
      window.debug.disableTrace = function disableTrace() {
        if (!this._orig) return;
        for (const [name, fn] of Object.entries(this._orig)) {
          window[name] = fn;
        }
        this._orig = {};
      };
    }
    if (window.debug.traceEnabled) window.debug.enableTrace(); else window.debug.disableTrace();
    // Emit DEV mode toggle event
    if (window.debug && window.debug.enabled) window.debug.event('mode', { dev: !!on });
    try { localStorage.setItem('gs_dev_mode', on ? '1' : '0'); } catch {}
  };
  applyDev(savedDev);
  devCheckbox.addEventListener('change', () => applyDev(!!devCheckbox.checked));
}

// Wire DEV buttons safely at end (after DOM is fully built)
(function wireDevButtons() {
  const startBtn = document.getElementById('start-test-game');
  const autoBtn = document.getElementById('run-auto-game');
  const copyBtn = document.getElementById('copy-log');
  const dlBtn = document.getElementById('download-debug');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (window.debug && window.debug.enabled) window.debug.event('ui', { action: 'click', id: 'start-test-game' });
      startNewGameWithTestSetup();
    });
  }
  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      if (window.debug && window.debug.enabled) window.debug.event('ui', { action: 'click', id: 'run-auto-game' });
      logClear();
      const saved = { showCardOverlay };
      try {
        showCardOverlay = function() {};
        const result = simulateOneGame({ playerPAT: 'auto' });
        log(`\n[Auto] Final: HOME ${result.home} — AWAY ${result.away}`);
      } finally {
        showCardOverlay = saved.showCardOverlay;
      }
    });
  }
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      if (window.debug && window.debug.enabled) window.debug.event('ui', { action: 'click', id: 'copy-log' });
      try { await navigator.clipboard.writeText(logElement.textContent || ''); alert('Log copied'); } catch {}
    });
  }
  if (dlBtn) {
    dlBtn.addEventListener('click', () => {
      if (window.debug && window.debug.enabled) window.debug.event('ui', { action: 'click', id: 'download-debug' });
      const meta = [
        `Timestamp: ${new Date().toISOString()}`,
        `Quarter: ${game.quarter}`,
        `Clock: ${game.clock}s`,
        `Down/ToGo: ${game.down} & ${game.toGo}`,
        `BallOn: ${game.ballOn}`,
        `Possession: ${game.possession.toUpperCase()}`,
        `Score: HOME ${game.score.player} — AWAY ${game.score.ai}`
      ].join('\n');
      const header = `=== GRIDIRON FULL DEBUG ===\n${meta}\n`;
      const gameLog = `\n=== GAME LOG ===\n${logElement.textContent || ''}`;
      const dbgEvents = (window.debug && window.debug.buffer) ? window.debug.buffer : [];
      const dbgText = `\n=== DEBUG EVENTS (${dbgEvents.length}) ===\n` + dbgEvents.map((e,i)=>{
        try { return `${i+1}. [${new Date(e.t||Date.now()).toISOString()}] ${e.type||'info'} ${e.msg ? e.msg : JSON.stringify({ ...e, t: undefined })}`; } catch { return `${i+1}. ${String(e)}`; }
      }).join('\n');
      const trace = (window.debug && window.debug.traceBuffer) ? window.debug.traceBuffer : [];
      const traceText = `\n=== TRACE (${trace.length}) ===\n` + trace.map((ev,i)=>{
        const indent = '  '.repeat(Math.max(0,(ev.depth||1)-1));
        const time = new Date(ev.t||Date.now()).toISOString();
        if (ev.phase === 'enter') {
          return `${i+1}. ${indent}> ${ev.name}(${JSON.stringify(ev.args)}) @ ${time}\n${indent}   state=${JSON.stringify(ev.state)}`;
        } else if (ev.phase === 'return') {
          return `${i+1}. ${indent}< ${ev.name} => ${JSON.stringify(ev.result)} (+${ev.dt}ms) @ ${time}\n${indent}   state=${JSON.stringify(ev.state)}`;
        } else if (ev.phase === 'throw') {
          return `${i+1}. ${indent}! ${ev.name} !! ${ev.error} (+${ev.dt}ms) @ ${time}\n${indent}   state=${JSON.stringify(ev.state)}`;
        }
        return `${i+1}. ${indent}? ${ev.name} ${JSON.stringify(ev)}`;
      }).join('\n');
      const content = header + gameLog + dbgText + traceText + '\n';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'gridiron-full-debug.log'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    });
  }
})();

if (themeSelect) {
  themeSelect.addEventListener('change', () => {
    ThemeManager.setTheme(themeSelect.value);
    SFX.setThemeName(themeSelect.value);
    // Show banner and play a short theme sting
    showThemeTransition(themeSelect.value);
  });
}
if (sfxEnabledInput) {
  sfxEnabledInput.addEventListener('change', () => SFX.setEnabled(!!sfxEnabledInput.checked));
}
if (sfxVolumeInput) {
  sfxVolumeInput.addEventListener('input', () => SFX.setVolume(parseFloat(sfxVolumeInput.value || '0.6')));
}

// Init theme from storage and sync SFX theme
ThemeManager.init();
SFX.setThemeName((() => { try { return localStorage.getItem('gs_theme_v1') || 'arcade'; } catch { return 'arcade'; } })());

// Hook SFX into existing VFX triggers
(function hookSFX() {
  // Patch touchdown handling by wrapping log triggers via monkey hooks where we already call VFX
  const _attemptFieldGoal = attemptFieldGoal;
  attemptFieldGoal = function() {
    const beforePlayer = game.score.player;
    const beforeAi = game.score.ai;
    _attemptFieldGoal.apply(this, arguments);
    const afterPlayer = game.score.player;
    const afterAi = game.score.ai;
    if (afterPlayer !== beforePlayer || afterAi !== beforeAi) {
      SFX.onFieldGoal(true);
    } else {
      SFX.onFieldGoal(false);
    }
  };
  const _attemptExtraPoint = attemptExtraPoint;
  attemptExtraPoint = function() {
    const beforePlayer = game.score.player;
    const beforeAi = game.score.ai;
    _attemptExtraPoint.apply(this, arguments);
    const afterPlayer = game.score.player;
    const afterAi = game.score.ai;
    SFX.onPAT(afterPlayer !== beforePlayer || afterAi !== beforeAi);
  };
})();

// Fire SFX inside resolvePlay flow: find our earlier insert points
const _resolvePlay = resolvePlay;
resolvePlay = function(playerCard, aiCard) {
  // We rely on existing VFX hooks already added; call and additionally watch score change & categories
  const before = { p: game.score.player, a: game.score.ai };
  _resolvePlay.call(this, playerCard, aiCard);
  const after = { p: game.score.player, a: game.score.ai };
  if (after.p > before.p || after.a > before.a) {
    // Score was added; touchdown detected somewhere in flow
    SFX.onTouchdown();
  }
};

// Expose quick test hooks in dev
window.__GS_SET_THEME = (t) => { ThemeManager.setTheme(t); SFX.setThemeName(t); };