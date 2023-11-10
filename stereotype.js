let lang = 'en';

const messages = {
	en: {
			title: 'STEREOtype',
			subtitle: 'by Tom Quinn for Ludum Dare 41',
			description: 'type each word in time with the beat',
			play: 'PLAY'
	},
	pt: {
			title: 'STEREOtype',
			subtitle: 'por Tom Quinn para Ludum Dare 41',
			description: 'digite cada palavra no tempo da batida',
			play: 'JOGAR'
	},
	dt: {
			title: 'STEREOtyp',
			subtitle: 'von Tom Quinn für Ludum Dare 41',
			description: 'tippen Sie jedes Wort im Takt',
			play: 'SPIELEN'
	},
	es: {
			title: 'STEREOtype',
			subtitle: 'por Tom Quinn para Ludum Dare 41',
			description: 'escribe cada palabra al ritmo de la música',
			play: 'JUGAR'
	}
};

function updateLanguage(newLang) {
	lang = newLang;
	setup();
}



var canvas = document.getElementById('gameCanvas');
canvas.width = 1920;
canvas.height = 1080;
var ctx = canvas.getContext('2d');

const GAME_AUTOPLAY = false;
const GAME_PERFECT_OFFSET_SECONDS = .075;
const GAME_OK_OFFSET_SECONDS = .15;
const GAME_WORDS_PER_LEVEL = 6;
const GAME_RESTS_PER_LEVEL = 2;
const GAME_STARTING_BPM = 120;
const GAME_BPM_CHANGE_RATE = .02;
const GAME_MAX_FAILS = 5;
const GFX_BACKGROUND_COLOR = '#000012';
const GFX_BACKGROUND_BEAT_COLOR = '#0C0C1E';
const GFX_BACKGROUND_GRID_COLOR = '#141520';
const GFX_BACKGROUND_GRID_ANGLE = 10 * Math.PI / 180;
const GFX_BACKGROUND_GRID_SPACING = canvas.height / 12;
const GFX_BACKGROUND_GRID_STROKE = canvas.height / 256;
const GFX_BACKGROUND_GRID_SCROLL_X = canvas.width / 2000;
const GFX_BACKGROUND_GRID_SCROLL_Y = -canvas.height / 2000;
const GFX_BACKGROUND_GRID_BUMP = .05;
const GFX_WORD_SCALE = .66;
const GFX_WORD_OFFSET_X = canvas.width * .33;
const GFX_WORD_BASE_COLOR = '#557380';
const GFX_WORD_OVER_COLOR = '#EEFAFF';
const GFX_WORD_UNDERLINE_STROKE = canvas.width / 160;
const GFX_WORD_UNDERLINE_DASH = canvas.width / 40;
const GFX_WORD_BOX_STROKE = canvas.width / 128;
const GFX_WORD_BOX_SCALE = .5;
const GFX_WORD_BOX_OFFSET_X = GFX_WORD_OFFSET_X - canvas.width * .1;
const GFX_WORD_BOX_OFFSET_Y = canvas.height * .07;
const GFX_WORD_BOX_SHIFT_FACTOR = .25;
const GFX_WORD_BOX_SYMBOL_SCALE = .75;
const GFX_WORD_BOX_SYMBOL_STROKE = canvas.width / 50;
const GFX_WORD_BOX_CHECK_COLOR = '#2AB573';
const GFX_WORD_BOX_X_COLOR = '#F15F60';
const GFX_WORD_FLIP_OFFSET_CHANCE = .25;
const GFX_WORDLINE_OFFSET_Y = canvas.height * -.033;
const GFX_WORDLINE_PUSHDOWN_FRAMES = 10;
const GFX_WORDLINE_FADEOUT_RATE = .25;
const GFX_WORDLINE_LETTER_TWIST_MULTIPLIER = 2;
const GFX_UI_FONT_SIZE = canvas.height / 20;
const GFX_UI_PADDING = canvas.height * .03;
const GFX_UI_FAIL_BOX_SIZE = canvas.height * .033;
const GFX_UI_FAIL_BOX_STROKE = canvas.height * .005;
const GFX_UI_FAIL_BOX_SPACING = GFX_UI_FAIL_BOX_SIZE * 1.5;
const GFX_UI_TIME_SIGNATURE_SCALING = 2;

var kick = new Tone.MembraneSynth({
	'pitchDecay': 0.02,
	'octaves': 3,
	'oscillator': {
		'type': 'square4'
	},
	'envelope': {
		'attack': 0.004,
		'decay': .15,
		'sustain': 0
	}
}).toMaster();
var hat = new Tone.MembraneSynth({
	'pitchDecay': 0.01,
	'octaves': 4,
	'oscillator': {
		'type': 'triangle'
	},
	'envelope': {
		'attack': 0.001,
		'decay': 0.2,
		'sustain': 0
	}
}).toMaster();
var autoPanner = new Tone.AutoPanner({
	'frequency': '4n',
	'depth': .5,
}).toMaster().start();
var synth = new Tone.Synth({
	oscillator: {
		type: "amsquare2",
		detune: 0.1,
		count: 5,
	},
	envelope: {
		attack: 0.05,
		decay: 0.5,
		sustain: 0.025,
		release: 0.2
	}
}).connect(autoPanner);
var bass = new Tone.FMSynth({
	"harmonicity": 1.001,
	"modulationIndex": 1.5,
	"carrier": {
		"oscillator": {
			"type": "sine"
		},
		"envelope": {
			"attack": 2,
			"decay": 1,
			"sustain": 0.1,
		},
	},
	"modulator": {
		"oscillator": {
			"type": "fatsine"
		},
		"envelope": {
			"attack": 2,
			"decay": 2,
			"sustain": 2,
			"release": 0.01
		},
	}
}).toMaster();
Tone.Transport.loop = true;

var score, words, scale;


//this function is called right before the scheduled time
function triggerKick(t) {
	//the time is the sample-accurate time of the event
	if (score > 0 || words[1].successCheck()) {
		kick.triggerAttackRelease('C2', '8n', t, 1.5);
	}
}
function triggerFirstMetronome(t) {
	//the time is the sample-accurate time of the event
	hat.triggerAttackRelease('C5', '8n', t, .166);
}
function triggerMetronome(t) {
	//the time is the sample-accurate time of the event
	hat.triggerAttackRelease('C4', '8n', t, .166);
}

class Pattern {
	constructor() {
		this.init();
		Tone.Transport.start();
	}

	init() {
		this.measureLength = 4;
		this.beats = [0, 1, 2, 3];
		this.resetEvents();
	}
	resetEvents() {
		Tone.Transport.cancel();
		for (let i = 0; i < this.measureLength; i++) {
			Tone.Transport.schedule(i == 0 ? triggerFirstMetronome : triggerMetronome, '0:' + i);
		}
		for (let i = 0; i < this.beats.length; i++) {
			let beat = this.beats[i];
			Tone.Transport.schedule(triggerKick, '0:' + beat);
			let note = scale[Math.randInt(0, scale.length)] + '3';
			Tone.Transport.schedule(function (t) {
				if (score > 0 || words[1].successCheck()) {
					synth.triggerAttackRelease(note, '8n', t, .2);
				}
			}, '0:' + beat);
		}
		let note = scale[Math.randInt(0, scale.length)] + '2';
		Tone.Transport.schedule(function (t) {
			if (score > 0 || words[1].successCheck()) {
				bass.triggerAttackRelease(note, Tone.Transport.loopEnd - .25, t, 1.25);
			}
		}, '0:0');
		Tone.Transport.loopEnd = '0:' + this.measureLength;
		Tone.Transport.schedule(checkLevelUp, Tone.Transport.loopEnd - .01);
	}

	addBeat() {
		this.addBeatHelper();
		this.beats.sort((a, b) => a - b);
		this.resetEvents();
	}
	addBeatHelper() {
		while (true) {
			let beat = Math.randInt(0, this.measureLength * 2) / 2;
			if (!this.beats.includes(beat)) {
				this.beats.push(beat);
				return;
			}
		}
	}
	moveBeat() {
		let index = Math.randInt(0, this.beats.length);
		this.addBeatHelper();
		this.beats.splice(index, 1);
		this.beats.sort((a, b) => a - b);
		this.resetEvents();
	}
	extendMeasureAndMoveBeatToNewMeasure() {
		let newBeat = this.measureLength + (Math.random() < .5 ? 0 : .5);
		this.measureLength++;
		let index = Math.randInt(0, this.beats.length);
		this.beats.splice(index, 1);
		this.beats.push(newBeat);
		this.beats.sort((a, b) => a - b);
		this.resetEvents();
	}
	randomBeat() {
		this.beats = randomBeatArray(this.beats.length, this.measureLength);
		console.log(this.beats);
		this.resetEvents();
	}
}

class Word {
	constructor(letters) {
		if (isNaN(letters)) {
			this.value = letters.toUpperCase();
		} else {
			let tries = 1000;
			while ((this.value == null || usedWords.has(this.value)) && tries > 0) {
				this.value = dictionary[lang][letters][Math.randInt(0, dictionary[lang][letters].length - 1)].toUpperCase();
				tries--;
			}
			usedWords.add(this.value);
		}
		this.canvas = document.createElement('canvas');
		this.canvas.width = canvas.width;
		this.canvas.height = canvas.height / 4;
		this.ctx = this.canvas.getContext('2d');
		this.init();
	}
	init() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.scores = new Array(this.value.length);
		this.scores.fill(-1);
		this.ctx.textAlign = 'left';
		this.ctx.textBaseline = 'middle';
		this.ctx.fillStyle = GFX_WORD_BASE_COLOR;
		this.ctx.font = (this.canvas.height * GFX_WORD_SCALE) + 'px Cambo';
		let midline = this.canvas.height / 2;
		this.ctx.fillText(this.value, GFX_WORD_OFFSET_X, midline);
		this.ctx.strokeStyle = GFX_WORD_BASE_COLOR;
		this.ctx.lineWidth = GFX_WORD_UNDERLINE_STROKE;
		this.ctx.setLineDash([GFX_WORD_UNDERLINE_DASH, GFX_WORD_UNDERLINE_DASH]);
		this.ctx.beginPath();
		this.ctx.moveTo(GFX_WORD_OFFSET_X, this.canvas.height * .775);
		this.ctx.lineTo(this.canvas.width * .9625, this.canvas.height * .775);
		this.ctx.stroke();
		let boxsize = this.canvas.height * GFX_WORD_BOX_SCALE;
		this.ctx.lineWidth = GFX_WORD_BOX_STROKE;
		this.ctx.setLineDash([]);
		this.ctx.strokeRect(GFX_WORD_BOX_OFFSET_X, GFX_WORD_BOX_OFFSET_Y, boxsize, boxsize);
	}

	keystroke(i, char, offset) {
		// Prevent overlapping letters.
		while (this.scores[i] != -1) {
			i++;
			if (i == this.scores.length) {
				return;
			}
			offset -= pattern.beats[i] - pattern.beats[i - 1];
		}
		// Score.
		let offsetSeconds = offset * 60 / Tone.Transport.bpm.value;
		if (char == this.value[i] && Math.abs(offsetSeconds) <= GAME_OK_OFFSET_SECONDS) {
			this.scores[i] = 1;
		} else {
			this.scores[i] = 0;
		}

		// Graphics.
		if (Math.abs(offsetSeconds) <= GAME_PERFECT_OFFSET_SECONDS) {
			offsetSeconds = 0;
		}
		if (char != this.value[i]) {
			offsetSeconds += Math.randFloat(0, .033) * (Math.random() < .5 ? 1 : -1);
		}
		offsetSeconds = Math.clamp(-.5, offsetSeconds, .5);
		let widthBefore = this.ctx.measureText(this.value.substring(0, i)).width;
		let widthAfter = this.ctx.measureText(this.value.substring(0, i + 1)).width;
		let x = GFX_WORD_OFFSET_X + (widthBefore + widthAfter) / 2;
		let theta = offsetSeconds * GFX_WORDLINE_LETTER_TWIST_MULTIPLIER * (Math.random() < GFX_WORD_FLIP_OFFSET_CHANCE ? -1 : 1);
		let shiftX = this.canvas.height * offsetSeconds * GFX_WORD_BOX_SHIFT_FACTOR * Math.randFloat(.5, 1) * (Math.random() < .5 ? -1 : 1);
		let shiftY = this.canvas.height * offsetSeconds * GFX_WORD_BOX_SHIFT_FACTOR * Math.randFloat(.5, 1) * (Math.random() < .5 ? -1 : 1);
		this.ctx.textAlign = 'center';
		this.ctx.fillStyle = GFX_WORD_OVER_COLOR;
		this.ctx.save();
		this.ctx.translate(x + shiftX, this.canvas.height / 2 + shiftY);
		this.ctx.rotate(theta);
		this.ctx.fillText(char, 0, 0);
		this.ctx.restore();
	}

	successCheck() {
		if (GAME_AUTOPLAY) {
			return true;
		}

		for (let score of this.scores) {
			if (score != 1) {
				return false;
			}
		}
		return true;
	}
	finalize() {
		let success = this.successCheck();
		let boxsize = this.canvas.height * GFX_WORD_BOX_SCALE;
		let centerX = GFX_WORD_BOX_OFFSET_X + boxsize / 2, centerY = GFX_WORD_BOX_OFFSET_Y + boxsize / 2;
		let left = centerX - boxsize * GFX_WORD_BOX_SYMBOL_SCALE / 2, right = centerX + boxsize * GFX_WORD_BOX_SYMBOL_SCALE / 2;
		let top = centerY - boxsize * GFX_WORD_BOX_SYMBOL_SCALE / 2, bottom = centerY + boxsize * GFX_WORD_BOX_SYMBOL_SCALE / 2;
		this.ctx.strokeStyle = success ? GFX_WORD_BOX_CHECK_COLOR : GFX_WORD_BOX_X_COLOR;
		this.ctx.lineWidth = GFX_WORD_BOX_SYMBOL_STROKE;
		if (success) {
			score++;
			this.ctx.beginPath();
			this.ctx.moveTo(left, centerY);
			this.ctx.lineTo(centerX, bottom - boxsize * GFX_WORD_BOX_SYMBOL_SCALE * .1);
			this.ctx.lineTo(right + boxsize * GFX_WORD_BOX_SYMBOL_SCALE * .33, top);
			this.ctx.stroke();
		} else {
			this.ctx.beginPath();
			this.ctx.moveTo(left, top);
			this.ctx.lineTo(right, bottom);
			this.ctx.stroke();
			this.ctx.beginPath();
			this.ctx.moveTo(right, top);
			this.ctx.lineTo(left, bottom);
			this.ctx.stroke();
		}
		return success;
	}
}
class Rest {
	constructor(measuresLeft) {
		this.canvas = document.createElement('canvas');
		this.canvas.width = canvas.width;
		this.canvas.height = canvas.height / 4;
		this.ctx = this.canvas.getContext('2d');
		this.ctx.textAlign = 'left';
		this.ctx.textBaseline = 'middle';
		this.ctx.fillStyle = GFX_WORD_BASE_COLOR;
		this.ctx.font = (this.canvas.height * GFX_WORD_SCALE) / 3 + 'px Cambo';
		let text = restsLeft > 1 ? ('RHYTHM CHANGE - ' + restsLeft + ' MEASURES OF REST') : 'GET READY!';
		this.ctx.fillText(text, GFX_WORD_BOX_OFFSET_X, this.canvas.height / 2);
	}
	keystroke() { }
	finalize() { }
}
class Tutorial {
	constructor(measuresLeft) {
			this.canvas = document.createElement('canvas');
			this.canvas.width = canvas.width;
			this.canvas.height = canvas.height / 4;
			this.ctx = this.canvas.getContext('2d');
			this.ctx.textAlign = 'left';
			this.ctx.textBaseline = 'middle';
			this.ctx.fillStyle = GFX_WORD_OVER_COLOR;
			this.ctx.font = (this.canvas.height * GFX_WORD_SCALE) / 2 + 'px Cambo';
			this.ctx.fillText(messages[lang].title, GFX_WORD_BOX_OFFSET_X, this.canvas.height * 0.25);
			this.ctx.font = (this.canvas.height * GFX_WORD_SCALE) / 8 + 'px Cambo';
			this.ctx.fillText(messages[lang].subtitle, GFX_WORD_BOX_OFFSET_X, this.canvas.height * 0.45);
			this.ctx.font = (this.canvas.height * GFX_WORD_SCALE) / 4 + 'px Cambo';
			this.ctx.fillText(messages[lang].description, GFX_WORD_BOX_OFFSET_X, this.canvas.height * 0.66);
	}
	keystroke() { }
	finalize() { }
}

var lastSeconds, pushdownFrames, level, wordsLeft, restsLeft, nextWordsLeft, nextRestsLeft, targetBPM, fails, restartCount, usedWords, pattern;

function setup() {
	// PRE-DEFINED VARS
	score = 0;
	words = new Array();
	scale = randomScale();
	// END PRE-DEFINED VARS
	Tone.Transport.position = 0;
	Tone.Transport.bpm.value = GAME_STARTING_BPM;
	lastSeconds = 0;
	pushdownFrames = 0;
	level = 0;
	wordsLeft = GAME_WORDS_PER_LEVEL - 3;
	restsLeft = GAME_RESTS_PER_LEVEL;
	nextWordsLeft = 0, nextRestsLeft = 0;
	targetBPM = GAME_STARTING_BPM;
	fails = 0;
	restartCount = 0;
	usedWords = new Set();
	pattern = new Pattern(4);
	words.push(new Word(pattern.beats.length));
	words.push(new Word(messages[lang].play));
	words.push(new Tutorial());
}

function loop() {
	window.requestAnimationFrame(loop);

	update();

	// Draw.
	updateAndDrawBackground();
	for (let i = 0; i < 6 && i < words.length; i++) {
		let row = i;
		if (pushdownFrames > 0) {
			row += Math.easeInOutQuad(GFX_WORDLINE_PUSHDOWN_FRAMES - pushdownFrames, -1, 1, GFX_WORDLINE_PUSHDOWN_FRAMES);
		}
		let y = (4 - row) / 5 * canvas.height + GFX_WORDLINE_OFFSET_Y;
		let alpha = 1;
		if (words[i].constructor.name == 'Tutorial') {
			alpha = 1;
		} else if (i == 0) {
			alpha = .5;
		} else if (i > 1) {
			alpha = Math.clamp(0, 1 - (row - 1) * GFX_WORDLINE_FADEOUT_RATE, 1);
		}
		ctx.globalAlpha = alpha;
		ctx.drawImage(words[i].canvas, 0, y);
		ctx.globalAlpha = 1;
	}
	drawUI();
}

setup();
loop();

function update() {
	if (fails == GAME_MAX_FAILS) {
		return;
	}

	if (Tone.Transport.bpm.value < targetBPM) {
		Tone.Transport.bpm.value = Math.min(Tone.Transport.bpm.value + GAME_BPM_CHANGE_RATE, targetBPM);
	}
	if (Tone.Transport.seconds < lastSeconds) {
		if (!GAME_AUTOPLAY && words.length == 3 && !words[1].successCheck()) {
			words[1].init();
		} else {
			if (words[1].finalize() == false) {
				fails++;
				if (fails == GAME_MAX_FAILS) {
					Tone.Transport.cancel();
					return;
				}
			}
			if (wordsLeft > 0) {
				words.unshift(new Word(pattern.beats.length));
				wordsLeft--;
			} else {
				words.unshift(new Rest(restsLeft));
				restsLeft--;
			}
			if (wordsLeft == 0 && restsLeft == 0) {
				wordsLeft = nextWordsLeft;
				restsLeft = nextRestsLeft;
				nextWordsLeft = 0;
				nextRestsLeft = 0;
			}
			if (words.length > 6) {
				words.pop();
			}
			pushdownFrames = GFX_WORDLINE_PUSHDOWN_FRAMES;
		}
	} else if (pushdownFrames > 0) {
		pushdownFrames--;
	}
	lastSeconds = Tone.Transport.seconds;
}
function checkLevelUp(t) {
	if (words[0].constructor.name == 'Rest' && words[1].constructor.name != 'Rest') {
		levelUp();
		Tone.Transport.position = 0;
	}
}

var gridScrollX = 0, gridScrollY = 0;
function updateAndDrawBackground() {
	let beatOffset = Math.abs(getClosestBeat(pattern.beats, Tone.Transport.position).offset);
	let bgColor = GFX_BACKGROUND_COLOR;
	let scale = 1;
	if (fails < GAME_MAX_FAILS && beatOffset <= .2 && score > 0) {
		let rgb1 = hexToRgb(GFX_BACKGROUND_COLOR);
		let rgb2 = hexToRgb(GFX_BACKGROUND_BEAT_COLOR);
		let t = beatOffset / .2;
		let r = Math.round(rgb1.r * t + rgb2.r * (1 - t));
		let g = Math.round(rgb1.g * t + rgb2.g * (1 - t));
		let b = Math.round(rgb1.b * t + rgb2.b * (1 - t));
		bgColor = 'rgb(' + r + ',' + g + ',' + b + ')';
		scale = 1 + (1 - t) * GFX_BACKGROUND_GRID_BUMP;
	}
	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, 1920, 1080);

	gridScrollX = (gridScrollX + GFX_BACKGROUND_GRID_SCROLL_X) % GFX_BACKGROUND_GRID_SPACING;
	gridScrollY = (gridScrollY + GFX_BACKGROUND_GRID_SCROLL_Y) % GFX_BACKGROUND_GRID_SPACING;

	ctx.strokeStyle = GFX_BACKGROUND_GRID_COLOR;
	ctx.lineWidth = GFX_BACKGROUND_GRID_STROKE;
	ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.scale(scale, scale);
	ctx.rotate(GFX_BACKGROUND_GRID_ANGLE);
	ctx.translate(-canvas.width / 2, -canvas.height / 2);
	let vertLineCount = Math.ceil(canvas.width / GFX_BACKGROUND_GRID_SPACING);
	for (let i = -2; i < vertLineCount + 1; i++) {
		ctx.beginPath();
		ctx.moveTo(i * GFX_BACKGROUND_GRID_SPACING + gridScrollX, -canvas.height / 2 + gridScrollY);
		ctx.lineTo(i * GFX_BACKGROUND_GRID_SPACING + gridScrollX, canvas.height * 3 / 2 + gridScrollY);
		ctx.stroke();
	}
	let horizLineCount = Math.ceil(canvas.height / GFX_BACKGROUND_GRID_SPACING);
	for (let i = -1; i < horizLineCount + 3; i++) {
		ctx.beginPath();
		ctx.moveTo(-canvas.width / 2 + gridScrollX, i * GFX_BACKGROUND_GRID_SPACING + gridScrollY);
		ctx.lineTo(canvas.width * 3 / 2 + gridScrollX, i * GFX_BACKGROUND_GRID_SPACING + gridScrollY);
		ctx.stroke();
	}
	ctx.restore();
}
function drawUI() {
	// Score.
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = GFX_WORD_OVER_COLOR;
	ctx.font = GFX_UI_FONT_SIZE + 'px Cambo';
	ctx.fillText('Score: ' + score, GFX_UI_PADDING, canvas.height - GFX_UI_PADDING);
	// Time signature.
	ctx.textBaseline = 'hanging';
	ctx.font = GFX_UI_FONT_SIZE * .25 * GFX_UI_TIME_SIGNATURE_SCALING + 'px Cambo';
	ctx.fillText('\u{1D15F} = ' + Math.round(Tone.Transport.bpm.value), GFX_UI_PADDING + GFX_UI_TIME_SIGNATURE_SCALING * 30, GFX_UI_PADDING);
	ctx.textBaseline = 'top';
	ctx.font = GFX_UI_FONT_SIZE * GFX_UI_TIME_SIGNATURE_SCALING + 'px Cambo';
	let clefTop = GFX_UI_PADDING + GFX_UI_FONT_SIZE * GFX_UI_TIME_SIGNATURE_SCALING * .25;
	ctx.fillText('\u{1D11E}', GFX_UI_PADDING, clefTop);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'hanging';
	ctx.font = GFX_UI_FONT_SIZE * .4 * GFX_UI_TIME_SIGNATURE_SCALING + 'px Cambo';
	ctx.fillText(pattern.measureLength, GFX_UI_PADDING + GFX_UI_TIME_SIGNATURE_SCALING * 38, clefTop + GFX_UI_TIME_SIGNATURE_SCALING * 12.5);
	ctx.fillText(4, GFX_UI_PADDING + GFX_UI_TIME_SIGNATURE_SCALING * 38, clefTop + GFX_UI_TIME_SIGNATURE_SCALING * 30);
	// Fail boxes.
	let failBoxMargin = GFX_UI_FAIL_BOX_SIZE * (1 - GFX_WORD_BOX_SYMBOL_SCALE) / 2;
	for (let i = 0; i < GAME_MAX_FAILS; i++) {
		let x = GFX_UI_PADDING + GFX_UI_FAIL_BOX_SPACING * i, y = canvas.height * .875;
		this.ctx.lineWidth = GFX_UI_FAIL_BOX_STROKE;
		ctx.strokeStyle = GFX_WORD_BASE_COLOR;
		ctx.strokeRect(x, y, GFX_UI_FAIL_BOX_SIZE, GFX_UI_FAIL_BOX_SIZE);
		if (fails > i) {
			this.ctx.lineWidth = GFX_UI_FAIL_BOX_STROKE * 2;
			ctx.strokeStyle = GFX_WORD_BOX_X_COLOR;
			ctx.beginPath();
			ctx.moveTo(x + failBoxMargin, y + failBoxMargin);
			ctx.lineTo(x + GFX_UI_FAIL_BOX_SIZE - failBoxMargin, y + GFX_UI_FAIL_BOX_SIZE - failBoxMargin);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x + GFX_UI_FAIL_BOX_SIZE - failBoxMargin, y + failBoxMargin);
			ctx.lineTo(x + failBoxMargin, y + GFX_UI_FAIL_BOX_SIZE - failBoxMargin);
			ctx.stroke();
		}
	}
	// Restart text.
	if (fails == GAME_MAX_FAILS) {
		let overText = 'RESTART'.substring(0, restartCount);
		let baseText = 'RESTART'.substring(restartCount, 7);
		ctx.font = GFX_UI_FONT_SIZE + 'px Cambo';
		let overTextWidth = ctx.measureText(overText).width;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(overText, GFX_UI_PADDING, canvas.height * .85);
		ctx.fillStyle = GFX_WORD_BASE_COLOR;
		ctx.fillText(baseText, GFX_UI_PADDING + overTextWidth, canvas.height * .85);
	}
}

function levelUp() {
	level++;
	if (level == 1) {
		pattern.addBeat();
	} else if (level == 2) {
		pattern.addBeat();
		nextRestsLeft += GAME_RESTS_PER_LEVEL;
	} else if (level == 3) {
		nextWordsLeft -= GAME_RESTS_PER_LEVEL;
		pattern.extendMeasureAndMoveBeatToNewMeasure();
	} else if (level == 4) {
		pattern.moveBeat();
	} else if (level == 5) {
		pattern.randomBeat();
		nextRestsLeft += GAME_RESTS_PER_LEVEL;
	} else if (level == 6) {
		nextWordsLeft -= GAME_RESTS_PER_LEVEL;
		pattern.extendMeasureAndMoveBeatToNewMeasure();
		pattern.addBeat();
	} else if (level == 7) {
		pattern.moveBeat();
		targetBPM += 4;
	} else if (level == 8) {
		pattern.addBeat();
		targetBPM += 4;
		nextRestsLeft += GAME_RESTS_PER_LEVEL;
	} else if (level == 9) {
		nextWordsLeft -= GAME_RESTS_PER_LEVEL;
		pattern.extendMeasureAndMoveBeatToNewMeasure();
		targetBPM += 2;
	} else if (level == 10) {
		pattern.addBeat();
		targetBPM += 2;
	} else if (level <= 15) {
		pattern.moveBeat();
		targetBPM += 4;
	} else {
		pattern.randomBeat();
		targetBPM += 4;
	}
	nextWordsLeft += GAME_WORDS_PER_LEVEL;
	nextRestsLeft += GAME_RESTS_PER_LEVEL;

	if (Math.random() < .25) {
		scale = randomScale();
	}
}

const typedLetters = [];
const typedLettersDiv = document.getElementById('typed-letters'); // Elemento HTML para exibir as letras digitadas
const wordDisplayDiv = document.getElementById('word-display'); // Elemento HTML para exibir a palavra
const sound = new Tone.Synth().toDestination(); // Substitua Synth por outro instrumento se desejar

window.addEventListener('keydown', function (e) {
	if (e.keyCode < 65 || e.keyCode > 90)
		return;

	const char = String.fromCharCode(e.keyCode).toUpperCase();

	if (fails == GAME_MAX_FAILS) {
		if (char == 'RESTART'[restartCount]) {
			restartCount++;
			if (restartCount == 7) {
				setup();
			}
		}
	} else {
		let word = words[1];
		let beat = getClosestBeat(pattern.beats, Tone.Transport.position);
		word.keystroke(beat.beat, char, beat.offset);
		typedLetters.push(char);

		// Atualiza o conteúdo do elemento HTML para exibir as letras digitadas.
		if (typedLettersDiv) {
			typedLettersDiv.textContent = typedLetters.join(' ');
		}

		// Atualiza o conteúdo do elemento HTML para exibir a palavra atual.
		if (wordDisplayDiv) {
			wordDisplayDiv.textContent = word; // Atualiza para a palavra correta
		}
		// Toca o mesmo som para todas as teclas pressionadas.
		sound.triggerAttackRelease('C2', '8n'); // Configure a nota e duração desejadas.
	}
});

// Função para mostrar o botão de "restart"
function showRestartButton() {
	const restartButton = document.getElementById('restart-button');
	restartButton.style.display = 'block';
  }
  
  // Verifica se o jogador perdeu e chame a função para mostrar o botão de "restart" 
  if (jogadorPerdeu) {
	showRestartButton();
  }
  
  // Adiciona um manipulador de eventos ao botão de "restart"
  const restartButton = document.getElementById('restart-button');
  restartButton.addEventListener('click', () => {
	// ## Adicionar aqui o código para reiniciar o jogo ##
  });




