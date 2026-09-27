import type { InputManager } from '../../core/input';
import type { VehicleInput } from './Vehicle';

/** Translate the current InputManager state into a VehicleInput for this step. */
export function readVehicleInput(input: InputManager): VehicleInput {
  return {
    throttle: input.axis('throttle'),
    brake: input.axis('brake'),
    steer: Math.max(-1, Math.min(1, input.axis('steer'))),
    handbrake: input.isDown('handbrake'),
    flipReset: input.justPressed('flipReset'),
  };
}
