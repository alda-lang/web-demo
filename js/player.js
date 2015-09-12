(function() {
	var input = document.querySelector("input[type=text]");

	var xhr = new XMLHttpRequest();
	xhr.open("get", "data.json", true);
	xhr.send();
	xhr.onload = function(e) {
		input.value = e.target.responseText;
	}

	var log = {
		_items: [],
		_node: document.querySelector("textarea"),
		clear: function() {
			this._items = [];
			this._node.value = "";
		},

		log: function() {
			var args = [].slice.call(arguments);
			this._items.push(args.join(" "));
			this._node.value = this._items.join("\n");
		},

		error: function() {
			var args = [].slice.call(arguments);
			args.unshift("!!");
			return this.log.apply(this, args);
		}
	}
	log.clear();

	var player = {
		play: function() {
			log.clear();
			try {
				var data = JSON.parse(input.value);
				log.log("successfully parsed input data");
			} catch (e) {
				log.error(e.message);
				return;
			}

			if (data[0] != "score") {
				log.error("first token is not 'score'");
				return;
			}

			this._processScore(data);
		},

		_processScore: function(data) {
			var attributes = {
				tempo: 120,
				duration: 1,
				octave: 4,
				quantization: 0.9,
				volume: 1,
				panning: 0.5,
				"track-volume": 100/127
			};

			var partIndex = 0;

			data.forEach(function(data, index) {
				if (!index) { return; }

				switch (data[0]) {
					case "global-attribute-change":
						attributes[data[1]] = this._processNumber(data[2]);
					break;

					case "part":
						this._processPart(data, attributes, partIndex);
						partIndex++;
					break;

					default:
						log.error("unkown score token", data[0]);
					break;
				}

			}, this);
		},

		_processNumber: function(data) {
			return Number(data[1]);
		},

		_processPart: function(data, globalAttributes, partIndex) {
			log.log("now processing part #", partIndex);
			var attributes = {
				partIndex: partIndex // FIXME unused
			};
			for (var p in globalAttributes) { attributes[p] = globalAttributes[p]; }

			var time = 0;

			data.forEach(function(data, index) {
				if (!index) { return; }

				switch (data[0]) {
					case "calls":
						log.log("ignoring unimplemented 'calls'");
					break;

					case "note":
						var note = this._processNote(data);
						if (note.duration) { attributes.duration = note.duration; }
						this._playNote(note.pitch, time, attributes);
						time += this._durationToSec(attributes);
					break;

					case "rest":
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
		},

		_processNote: function(data) {
			var note = {
				pitch: data[1][1]
			}
			if (data.length > 2) {
				note.duration = this._processDuration(data[2]);
			}
			return note;
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
			var velocity = Math.round(127 * attributes.volume);

			var key = pitch[0].toUpperCase() + attributes.octave
			if (!(key in MIDI.keyToNote)) {
				log.error("key", key, "not found in conversion table");
				return;
			}

			var note = MIDI.keyToNote[key];
			if (pitch[1] == "+") { note++; }
			if (pitch[1] == "-") { note--; }

			MIDI.noteOn(0, note, velocity, time);
			MIDI.noteOff(0, note, time + delay);
			log.log("playing", note, "(", pitch, ")", "at", time, "for", delay, "secs");
		}
	}

	window.player = player;
})();

document.querySelector("form").addEventListener("submit", function(e) {
	e.preventDefault();
	player.play();
});
