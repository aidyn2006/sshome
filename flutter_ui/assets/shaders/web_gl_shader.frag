#include <flutter/runtime_effect.glsl>

uniform vec2 resolution;
uniform float time;
uniform float xScale;
uniform float yScale;
uniform float distortion;

out vec4 fragColor;

void main() {
  vec2 fragCoord = FlutterFragCoord().xy;
  // Flip Y axis to match original WebGL behavior
  fragCoord.y = resolution.y - fragCoord.y;

  vec2 p = (fragCoord * 2.0 - resolution) / min(resolution.x, resolution.y);

  float d = length(p) * distortion;

  float rx = p.x * (1.0 + d);
  float gx = p.x;
  float bx = p.x * (1.0 - d);

  float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
  float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
  float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);

  fragColor = vec4(r, g, b, 1.0);
}
