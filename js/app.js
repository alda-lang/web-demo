(function() {
	var input = document.querySelector("input[type=text]");

	var go = function() {
		try {
			var parsed = alda_cljs.parser.parse(input.value);
		} catch (e) {
			log.error(e.message);
			return;
		}
console.log(parsed);
		var score = processor.process(parsed);
		if (score) { player.play(score); }
	}

	document.querySelector("form").addEventListener("submit", function(e) {
		e.preventDefault();
		go();
	});

	go();
})();
