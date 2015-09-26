(function() {
	var input = document.querySelector("input[type=text]");

	var go = function() {
		log.clear();

		try {
			var parsed = alda_cljs.parser.parse(input.value);
			if (!(parsed instanceof Array)) {
				var parts = parsed.reason.map(function(reason) {
					return "expecting " + reason.expecting;
				});
				throw new Error(parts.join(", "));
			}
		} catch (e) {
			log.error(e.message);
			return;
		}

		var score = processor.process(parsed);
		if (score) { 
			location.hash = input.value;
			player.play(score);
			
			var ser = new XMLSerializer();
			var str = ser.serializeToString(processor.xml);
			var blob = new Blob([str]);

			var link = document.querySelector("a");
			link.href = URL.createObjectURL(blob);
		}
	}

	document.querySelector("form").addEventListener("submit", function(e) {
		e.preventDefault();
		go();
	});

	input.value = (location.hash ? decodeURIComponent(location.hash.substring(1)) : "piano: c d e f");
	go();
})();
