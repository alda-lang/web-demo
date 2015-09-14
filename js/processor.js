(function() {
	var processor = {
		_result: {},

		process: function(str) {
			log.clear();
			try {
				var data = JSON.parse(str);
				log.log("successfully parsed input data");
			} catch (e) {
				log.error(e.message);
				return;
			}

			if (data[0] != "score") {
				log.error("first token is not 'score'");
				return;
			}

			return this._processScore(data);
		},

		_processScore: function(data) {
			var score = {
				parts: []
			};

			var attributes = {
				tempo: 120,
				duration: 1,
				octave: 4,
				quantization: 0.9,
				volume: 1,
				panning: 0.5,
				"track-volume": 100/127
			};

			data.forEach(function(data, index) {
				if (!index) { return; }

				switch (data[0]) {
					case "global-attribute-change":
						attributes[data[1]] = this._processNumber(data[2]);
					break;

					case "part":
						var part = this._processPart(data, attributes, score.parts.length);
						score.parts.push(part);
					break;

					default:
						log.error("unkown score token", data[0]);
					break;
				}

			}, this);

			return score;
		},

		_processNumber: function(data) {
			return Number(data[1]);
		},

		_processPart: function(data, globalAttributes) {
			log.log("processing next part");
			var attributes = {};
			for (var p in globalAttributes) { attributes[p] = globalAttributes[p]; }

			var time = 0;
			var result = {
				notes: []
			};

			data.forEach(function(data, index) {
				if (!index) { return; }

				switch (data[0]) {
					case "calls":
						result.instrument = data[1][1];
						log.log("part will be played on", result.instrument);
					break;

					case "note":
						var pitch = data[1][1];
						if (data.length > 2) { attributes.duration = this._processDuration(data[2]); }
						var note = this._playNote(pitch, time, attributes);
						result.notes.push(note);
						time += this._durationToSec(attributes);
					break;

					case "rest":
						if (data.length > 2) { attributes.duration = this._processDuration(data[2]); }
						time += this._durationToSec(attributes);
					break;

					case "octave-up": attributes["octave"]++; break;
					case "octave-down": attributes["octave"]--; break;
					case "octave-set": attributes["octave"] = this._processNumber(data[1]); break;

					default:
						log.error("unkown part token", data[0]);
					break;
				}
			}, this);

			return result;
		},

		_processDuration: function(data) {
			var duration = 0;
			for (var i=1;i<data.length;i++) {
				duration += 1/this._processNumber(data[i][1]);
			}
			return duration;
		},

		_durationToSec: function(attributes) {
			var bps = attributes.tempo / 60; /* quater notes per second */
			return 4 * attributes.duration / bps;
		},

		_playNote: function(pitch, time, attributes) {
			var delay = this._durationToSec(attributes) * attributes.quantization;
			var velocity = Math.round(127 * attributes.volume * attributes["track-volume"]);

			var key = pitch[0].toUpperCase() + attributes.octave
			if (!(key in MIDI.keyToNote)) {
				log.error("key", key, "not found in conversion table");
				return;
			}

			var note = MIDI.keyToNote[key];
			if (pitch[1] == "+") { note++; }
			if (pitch[1] == "-") { note--; }

			log.log("scheduling", note, "(", pitch, ")", "at", time, "for", delay, "secs");
			return {
				note: note,
				velocity: velocity,
				time: time,
				delay: delay
			};
		}
	}

	window.processor = processor;
})();
