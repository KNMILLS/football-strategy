import type { CommentaryTemplate } from '../CommentaryEngine';
import type { DiceTag } from '../TagMapper';

// Additional run-specific templates
export const RUN_TEMPLATES: CommentaryTemplate[] = [
  {
    tags: ['run', 'inside_run', 'first_down'],
    priority: 14,
    variants: [
      'Pounds inside for the first down.',
      'Inside run converts the third down.',
      'Between the tackles for a fresh set of downs.',
      'Interior run keeps the drive alive.',
      'Inside zone picks up the first down.'
    ]
  },
  {
    tags: ['run', 'outside_run', 'explosive'],
    priority: 18,
    variants: [
      'Breaks outside for a huge gain!',
      'Outside run goes for big yards.',
      'Bounce to the perimeter for a chunk play.',
      'Outside zone finds daylight for ${yards} yards.',
      'Stretches the field for an explosive run.'
    ]
  },
  {
    tags: ['run', 'draw'],
    priority: 12,
    variants: [
      'Draw play fools the defense.',
      'Delayed handoff catches them off guard.',
      'Draw play develops for ${yards} yards.',
      'Quarterback draws them in before handing off.',
      'Misleading draw play works perfectly.'
    ]
  },
  {
    tags: ['run', 'counter'],
    priority: 12,
    variants: [
      'Counter play reverses field.',
      'Counter run catches the flow.',
      'Pulling linemen lead the counter.',
      'Counter trey fools the pursuit.',
      'Reverse flow counter for ${yards}.'
    ]
  },
  {
    tags: ['run', 'zone_run'],
    priority: 11,
    variants: [
      'Zone blocking creates a seam.',
      'Cutback lane opens for ${yards} yards.',
      'Zone scheme finds the hole.',
      'Patience pays off in the zone run.',
      'Zone blocking creates running room.'
    ]
  },
  {
    tags: ['run', 'red_zone'],
    priority: 16,
    variants: [
      'Red zone run grinds toward the goal.',
      'Inside run in the shadow of the goal post.',
      'Goal line run pushes toward paydirt.',
      'Short yardage run in scoring territory.',
      'Red zone carry moves closer to six.'
    ]
  },
  {
    tags: ['run', 'backed_up'],
    priority: 9,
    variants: [
      'Backed up run picks up needed yards.',
      'Conservative run from deep in own territory.',
      'Safe run to avoid the safety.',
      'Field position run maintains possession.',
      'Careful run from poor field position.'
    ]
  }
];

// Analyst run templates
export const RUN_ANALYST_TEMPLATES: CommentaryTemplate[] = [
  {
    tags: ['run', 'inside_run'],
    priority: 10,
    variants: [
      'Great push up front creates the lane.',
      'Offensive line wins at the point of attack.',
      'Running back finds the cutback lane.',
      'Interior blocking was outstanding.',
      'Linebackers got washed out of the hole.'
    ]
  },
  {
    tags: ['run', 'outside_run'],
    priority: 10,
    variants: [
      'Edge blocking sealed the perimeter.',
      'Speed to turn the corner was key.',
      'Outside zone read worked perfectly.',
      'Tight end sealed the edge beautifully.',
      'Cutback vision was exceptional.'
    ]
  },
  {
    tags: ['run', 'explosive'],
    priority: 18,
    variants: [
      'Missed tackles downfield cost them.',
      'Outstanding blocking sustained the run.',
      'Speed and vision combined for the big play.',
      'Defensive pursuit was too slow.',
      'Perfect scheme against that front.'
    ]
  },
  {
    tags: ['run', 'red_zone'],
    priority: 16,
    variants: [
      'Physical running in the red zone.',
      'Short yardage execution was perfect.',
      'Defensive front got worn down.',
      'Power running game imposing its will.',
      'Goal line stand attempt fails.'
    ]
  }
];
