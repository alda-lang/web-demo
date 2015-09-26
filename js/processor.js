(function() {
	var processor = {
		score: null,
		xml: null,
		_divisions: 32, /* MusicXML <divisions> */

		process: function(data) {
			if (data[0] != "score") {
				log.error("first token is not 'score'");
				return;
			}
			
			var doctype = document.implementation.createDocumentType(
				"score-partwise",
				"-//Recordare//DTD MusicXML 1.0 Partwise//EN",
				"http://www.musicxml.org/dtds/partwise.dtd"
			);
			this.xml = document.implementation.createDocument("", "score-partwise", doctype);
			
			var partListNode = this.xml.createElement("part-list");
			this.xml.documentElement.appendChild(partListNode);
			
			this.score = this._processScore(data, partListNode);

			return this.score;
		},

		_processScore: function(data, partListNode) {
			var score = {
				parts: []
			};

			var attributes = {
				tempo: 120,
				duration: 4, /* quarter note */
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
						var part = this._processPart(data, attributes, partListNode);
						score.parts.push(part);
					break;

					default:
						log.error("unkown score token", data[0]);
					break;
				}

			}, this);

			return score;
		},

		_processPart: function(data, globalAttributes, partListNode) {
			log.log("processing next part");
			var attributes = {};
			for (var p in globalAttributes) { attributes[p] = globalAttributes[p]; }

			var time = 0;
			var result = {
				notes: []
			};
			
			var id = "P" + this.xml.querySelectorAll("score-part").length;
			var scorePartNode = this.xml.createElement("score-part");
			scorePartNode.setAttribute("id", id);
			partListNode.appendChild(scorePartNode);

			var partNode = this.xml.createElement("part");
			this.xml.documentElement.appendChild(partNode);
			partNode.setAttribute("id", id);
			
			var measureNode = this.xml.createElement("measure");
			partNode.appendChild(measureNode);
			measureNode.setAttribute("number", "1");
			
			var attributeNode = this.xml.createElement("attributes");
			measureNode.appendChild(attributeNode);
			var divisionsNode = this.xml.createElement("divisions");
			attributeNode.appendChild(divisionsNode);
			divisionsNode.textContent = this._divisions;

			data.forEach(function(data, index) {
				if (!index) { return; }

				switch (data[0]) {
					case "calls":
						result.instrument = data[1][1];
						log.log("part will be played on", result.instrument);
	
						var partNameNode = this.xml.createElement("part-name");
						partNameNode.textContent = result.instrument;
						scorePartNode.appendChild(partNameNode);
					break;

					case "note":
						var note = this._processNote(data, attributes, time, measureNode);
						result.notes.push(note);
						time += note.duration;
					break;

					case "rest":
						time += this._processRest(data, attributes, measureNode);
					break;

					case "octave-up": attributes["octave"]++; break;
					case "octave-down": attributes["octave"]--; break;
					case "octave-set": attributes["octave"] = this._processNumber(data[1]); break;
					
					default: log.error("unkown part token", data[0]); break;
				}
			}, this);

			return result;
		},
		
		_processNote: function(data, attributes, time, measureNode) {
			var pitch = data[1][1];

			var noteNode = this.xml.createElement("note");
			var pitchNode = this.xml.createElement("pitch");
			noteNode.appendChild(pitchNode);
			var stepNode = this.xml.createElement("step");
			pitchNode.appendChild(stepNode);
			stepNode.textContent = pitch[0];
			if (pitch.length > 1) {
				var alterNode = this.xml.createElement("alter");
				pitchNode.appendChild(alterNode);
				alterNode.textContent = (pitch[1] == "+" ? 1 : -1);
			}
			var octaveNode = this.xml.createElement("octave");
			pitchNode.appendChild(octaveNode);
			octaveNode.textContent = attributes.octave;

			var playTime = 0;
			if (data.length > 2) {
				var duration = this._processDuration(data[2]);
				attributes.duration = duration[0].length;

				duration.forEach(function(item) {
					playTime += this._durationToSec(item.length, item.dots, attributes);
					
					var clone = noteNode.cloneNode(true);

					var durationNode = this.xml.createElement("duration");
					clone.appendChild(durationNode);
					durationNode.textContent = this._divisions*4/item.length;
					
					for (var i=0;i<item.dots;i++) {
						var dotNode = this.xml.createElement("dot");
						clone.appendChild(dotNode);
					}

					measureNode.appendChild(clone);
				}, this);

			} else {
				playTime = this._durationToSec(attributes.duration, 0, attributes);

				var durationNode = this.xml.createElement("duration");
				noteNode.appendChild(durationNode);
				durationNode.textContent = this._divisions*4/attributes.duration;

				measureNode.appendChild(noteNode);
			}

			return this._scheduleNote(pitch, time, playTime, attributes);
		},
		
		_processRest: function(data, attributes, measureNode) {
			var noteNode = this.xml.createElement("note");
			var restNode = this.xml.createElement("rest");
			noteNode.appendChild(restNode);

			var playTime = 0;
			if (data.length > 1) {
				var duration = this._processDuration(data[1]);
				attributes.duration = duration[0].length;

				duration.forEach(function(item) {
					playTime += this._durationToSec(item.length, item.dots, attributes);

					var clone = noteNode.cloneNode(true);

					var durationNode = this.xml.createElement("duration");
					clone.appendChild(durationNode);
					durationNode.textContent = this._divisions*4/item.length;

					for (var i=0;i<item.dots;i++) {
						var dotNode = this.xml.createElement("dot");
						clone.appendChild(dotNode);
					}

					measureNode.appendChild(clone);
				}, this);
			} else {
				playTime = this._durationToSec(attributes.duration, 0, attributes);

				var durationNode = this.xml.createElement("duration");
				noteNode.appendChild(durationNode);
				durationNode.textContent = this._divisions*4/attributes.duration;

				measureNode.appendChild(noteNode);
			}
			
			return playTime;
		},
		
		_processDuration: function(data) {
			var results = [];

			for (var i=1; i<data.length; i++) {
				var item = data[i];
				switch (item[0]) {
					case "note-length":
						results.push(this._processNoteLength(item));
					break;
					
					default:
						log.error("unknown duration subpart", item[0]);
					break;
				}
			}
			
			return results;
		},
		
		_processNoteLength: function(data) {
			return {
				length: this._processNumber(data[1]),
				dots: data.length > 2 ? data[2][1].length : 0
			};
		},

		_processNumber: function(data) {
			return Number(data[1]);
		},

		_durationToSec: function(length, dots, attributes) {
			var bps = attributes.tempo / 60; /* quater notes per second */
			var base = 4 / (bps * length);
			var sec = base;
			for (var i=0;i<dots;i++) {
				sec += base / (2 << i);
			}
			return sec;
		},

		_scheduleNote: function(pitch, time, duration, attributes) {
			var delay = duration * attributes.quantization;
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
				delay: delay,
				duration: duration
			};
		}
	}

	window.processor = processor;
})();
