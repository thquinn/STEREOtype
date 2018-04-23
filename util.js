Math.randFloat = function (min, max) {
  return Math.random() * (max - min) + min;
};
Math.randInt = function (min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};
Math.randInts = function(min, max, n) {
  let s = new Set();
  while (s.size < n) {
    s.add(Math.randInt(min, max));
  }
  let a = Array.from(s);
  a.sort((a, b) => a - b);
  return a;
}
Math.clamp = function (min, val, max) {
  return Math.min(Math.max(val, min), max);
}
// from http://www.gizma.com/easing/
Math.easeInOutQuad = function (t, b, c, d) {
  t /= d/2;
  if (t < 1) return c/2*t*t + b;
  t--;
  return -c/2 * (t*(t-2) - 1) + b;
};

Array.prototype.shuffle = function() {
  var j, x, i;
    for (i = this.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = this[i];
        this[i] = this[j];
        this[j] = x;
    }
};

// from Tim Down on StackOverflow
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function randomBeatArray(notes, measureLength) {
  let allPositions = [];
  for (let i = 0; i < measureLength; i++) {
    allPositions.push(i);
    allPositions.push(i + .5);
  }
  allPositions.shuffle();
  allPositions.splice(notes, allPositions.length - notes);
  allPositions.sort((a, b) => a - b);
  return allPositions;
}

function getClosestBeat(beats, val) {
  let valTokens = val.split(':');
  val = Number(valTokens[0]) * 4 + Number(valTokens[1]) + Number(valTokens[2]) / 4;
  val -= .32;
  let bestDelta = Number.MAX_SAFE_INTEGER;
  let bestI = -1;
  for (let i = 0; i < beats.length; i++) {
    let delta = val - beats[i];
    if (Math.abs(delta) < Math.abs(bestDelta)) {
      bestDelta = delta;
      bestI = i;
    }
  }
  return { beat: bestI, offset: bestDelta };
}

function randomScale() {
  let notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  notes = notes.concat(notes);
  let scaleStart = Math.randInt(0, 12);
  notes = notes.slice(scaleStart, scaleStart + 12);
  let offsets;
  while (true) {
    offsets = new Set(Math.randInts(0, 12, 7));
    let success = true;
    for (let i = 0; i < 12; i++) {
      let a = offsets.has(i), b = offsets.has((i + 1) % 12), c = offsets.has((i + 2) % 12);
      if (a && b && c) {
        success = false;
        break;
      }
      if (!a && !b && !c) {
        success = false;
        break;
      }
    }
    if (success) {
      break;
    }
  }
  for (let i = 11; i >= 0; i--) {
    if (!offsets.has(i)) {
      notes.splice(i, 1);
    }
  }
  return notes;
}