// Special case templates for unique game situations
export const SPECIAL_CASE_TEMPLATES = [
    {
        tags: ['safety'],
        priority: 25,
        variants: [
            'Safety! Two points for the defense.',
            'Tackled in the end zone for a safety.',
            'Intentional grounding in the end zone.',
            'Quarterback goes down in his own end zone.',
            'Safety awarded to the defense.'
        ]
    },
    {
        tags: ['field_goal'],
        priority: 15,
        variants: [
            'Field goal is good! Three points.',
            'Kicker splits the uprights.',
            'Field goal attempt is successful.',
            'Three points on the board.',
            'Kicker converts from ${fieldPosition} yards.'
        ]
    },
    {
        tags: ['missed_fg'],
        priority: 15,
        variants: [
            'Field goal attempt misses wide.',
            'Kick sails wide of the uprights.',
            'Field goal is no good.',
            'Kicker pulls it left.',
            'Missed field goal opportunity.'
        ]
    },
    {
        tags: ['defensive_touchdown'],
        priority: 30,
        variants: [
            'Touchdown defense! Pick-six!',
            'Defensive touchdown! Six points!',
            'House call by the defense!',
            'Interception returned for touchdown!',
            'Fumble returned for six!'
        ]
    },
    {
        tags: ['offensive_touchdown'],
        priority: 30,
        variants: [
            'Touchdown! Six points for the offense!',
            'Touchdown! Ball crosses the goal line!',
            'Six points on the board!',
            'Offensive touchdown caps the drive!',
            'Touchdown! Great execution!'
        ]
    },
    {
        tags: ['goal_line_stand'],
        priority: 20,
        variants: [
            'Goal line stand by the defense!',
            'Defense holds at the one-yard line!',
            'Stopped short of the goal line!',
            'Great stand by the defensive front!',
            'Turnover on downs at the goal line!'
        ]
    },
    {
        tags: ['turnover_on_downs'],
        priority: 18,
        variants: [
            'Turnover on downs!',
            'Offense fails to convert on fourth down.',
            'Defense takes over on downs.',
            'Failed fourth down conversion.',
            'Turnover on downs gives possession away.'
        ]
    }
];
// Analyst templates for special cases
export const SPECIAL_CASE_ANALYST_TEMPLATES = [
    {
        tags: ['safety'],
        priority: 25,
        variants: [
            'Huge momentum swing with that safety.',
            'Defense pins them deep in their own territory.',
            'Field position battle just got tougher.',
            'Safety gives defense excellent field position.',
            'That safety changes the entire game dynamic.'
        ]
    },
    {
        tags: ['field_goal'],
        priority: 15,
        variants: [
            'Smart decision to take the points.',
            'Kicker comes through in the clutch.',
            'Field goal extends the lead.',
            'Points are points in a close game.',
            'Kicking game proves its worth.'
        ]
    },
    {
        tags: ['missed_fg'],
        priority: 15,
        variants: [
            'Missed opportunity to put points on the board.',
            'Kicker needs to be more consistent.',
            'Defense holds and forces the miss.',
            'Field position after the miss could be key.',
            'Momentum stays with the defense.'
        ]
    },
    {
        tags: ['defensive_touchdown'],
        priority: 30,
        variants: [
            'Game-changing play by the defense.',
            'Perfect read and execution on the return.',
            'Defense completely takes over the momentum.',
            'Special teams touchdown shifts the game.',
            'Outstanding awareness and speed on the return.'
        ]
    },
    {
        tags: ['offensive_touchdown'],
        priority: 30,
        variants: [
            'Perfect execution in the red zone.',
            'Offense imposes its will on that drive.',
            'Great mix of run and pass throughout the drive.',
            'Touchdown gives them the lead.',
            'Scoring drive shows offensive balance.'
        ]
    }
];
// Weather and condition templates (for future expansion)
export const WEATHER_TEMPLATES = [
    {
        tags: ['windy'],
        priority: 5,
        variants: [
            'Wind affecting the passing game.',
            'Kicker battling the windy conditions.',
            'Crosswinds making passes difficult.',
            'Weather becoming a factor.',
            'Windy conditions favor the run game.'
        ]
    },
    {
        tags: ['rainy'],
        priority: 5,
        variants: [
            'Rain making the ball slick.',
            'Wet conditions affecting grip.',
            'Field getting slippery in the rain.',
            'Weather impacting ball security.',
            'Rainy conditions favor power running.'
        ]
    }
];
// Close game situation templates
export const CLOSE_GAME_TEMPLATES = [
    {
        tags: ['clock_management', 'two_minute'],
        priority: 22,
        variants: [
            'Every play critical in this close game.',
            'Pressure mounting in the final minutes.',
            'Close game comes down to execution.',
            'Tension building as time winds down.',
            'Every yard matters in this tight contest.'
        ]
    },
    {
        tags: ['clock_management', 'red_zone'],
        priority: 20,
        variants: [
            'Red zone opportunity in a close game.',
            'Scoring here could be game-changing.',
            'Defense needs a stop in scoring territory.',
            'Red zone execution will decide this drive.',
            'Close game amplifies red zone importance.'
        ]
    }
];
// Clock management templates
export const CLOCK_TEMPLATES = [
    {
        tags: ['clock_management', 'two_minute'],
        priority: 16,
        variants: [
            'Clock management becomes crucial.',
            'Need to balance scoring and time.',
            'Two-minute drill execution is key.',
            'Time management will decide this game.',
            'Every second counts now.'
        ]
    },
    {
        tags: ['hurry_up'],
        priority: 14,
        variants: [
            'Hurry-up offense trying to save time.',
            'Quick snaps to preserve the clock.',
            'No-huddle to speed up the pace.',
            'Hurry-up mode to manage the clock.',
            'Quick tempo to control the game flow.'
        ]
    }
];
// Injury and substitution templates (for future expansion)
export const INJURY_TEMPLATES = [
    {
        tags: ['penalty'],
        priority: 12,
        variants: [
            'Injury timeout called.',
            'Player down on the field.',
            'Medical staff attending to the player.',
            'Injury stoppage in play.',
            'Player being helped off the field.'
        ]
    }
];
// Timeout and challenge templates
export const TIMEOUT_TEMPLATES = [
    {
        tags: ['clock_management'],
        priority: 10,
        variants: [
            'Timeout called to stop the clock.',
            'Strategic timeout to regroup.',
            'Timeout preserves precious seconds.',
            'Coaching staff calls a timeout.',
            'Timeout to discuss the next play.'
        ]
    },
    {
        tags: ['penalty'],
        priority: 12,
        variants: [
            'Challenge flag thrown.',
            'Coaches challenging the ruling.',
            'Replay review requested.',
            'Officials reviewing the play.',
            'Challenge could change the outcome.'
        ]
    }
];
// Scoring drive summary templates
export const SCORING_DRIVE_TEMPLATES = [
    {
        tags: ['offensive_touchdown'],
        priority: 18,
        variants: [
            'Impressive drive ends with points.',
            'Scoring drive shows offensive efficiency.',
            'Great mix of plays on that drive.',
            'Scoring march down the field.',
            'Points on the board after sustained drive.'
        ]
    }
];
//# sourceMappingURL=SpecialCases.js.map