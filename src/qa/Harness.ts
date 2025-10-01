import { EventBus } from '../utils/EventBus';
import { registerQAHarness as registerFromModules } from './register';

export function registerQAHarness(bus: EventBus): void {
  registerFromModules(bus);
}


