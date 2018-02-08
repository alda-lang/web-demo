(function() {
	var player = {
		play: function(score) {
			var instruments = this._getInstruments(score);

			MIDI.loadPlugin({
				soundfontUrl: "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/",
				instrument: instruments,
				onprogress: function(state, progress) {
					log.log("instrument progress", state, progress);
				},
				onsuccess: function() {
					this._doPlay(score);
				}.bind(this)
			});
		},

		_getInstruments: function(score) {
			var result = {};

			score.parts.forEach(function(part, index) {
				var i = (part.instrument || "").toLowerCase();

				for (var p in MIDI.GM.byName) {
					var obj = MIDI.GM.byName[p];

					if (i == obj.instrument.toLowerCase()) {
						part.instrument = obj.number;
						result[p] = 1;
						return;
					}

					if (i == obj.category.toLowerCase()) {
						part.instrument = obj.number;
						result[p] = 1;
						log.log("Replacing category name", i, "with first instrument", obj.instrument);
						return;
					}
				}

				log.error("Unknown instrument", i);
				part.instrument = 0;

			}, this);

			return Object.keys(result);
		},

		_doPlay: function(score) {
			score.parts.forEach(this._playPart, this);
		},

		_playPart: function(part, index) {
			var globalDelay = 0.5; // FIXME delay the playback a bit to offset the CPU load when processing instruments
			MIDI.programChange(index, part.instrument);

			part.notes.forEach(function(note) {
				MIDI.noteOn(0, note.note, note.velocity, note.time + globalDelay);
				MIDI.noteOff(0, note.note, note.time + note.delay + globalDelay);
			});
		}
	}

	window.player = player;
})();
