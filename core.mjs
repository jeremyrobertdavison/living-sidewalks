export function combatBlocks(combats, sceneId) {
  return Array.from(combats).some(c => c.started && (!c.scene || (c.scene.id ?? c.scene) === sceneId));
}
export function advance(position, route, budget) {
  const points = route.points;
  let index = Math.min(Math.max(route.index ?? 0, 0), points.length - 1);
  let direction = route.direction === -1 ? -1 : 1;
  let x = position.x, y = position.y;
  // Stop at each waypoint so rendered movement never cuts a sidewalk corner.
  for (let i = 0; i <= points.length * 2; i++) {
    const target = points[index];
    const distance = Math.hypot(target.x - x, target.y - y);
    if (distance > 0.01) {
      const ratio = Math.min(1, budget / distance);
      return {x: x + (target.x-x)*ratio, y: y + (target.y-y)*ratio, index, direction};
    }
    if (route.mode === 'loop') index = (index + 1) % points.length;
    else {
      if (index === points.length - 1) direction = -1;
      if (index === 0) direction = 1;
      index += direction;
    }
  }
  return {x, y, index, direction};
}
