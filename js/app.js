(function() {
	var input = document.querySelector("input[type=text]");

	var go = function() {
		var score = processor.process(input.value);
		player.play(score);
	}

	document.querySelector("form").addEventListener("submit", function(e) {
		e.preventDefault();
		go();
	});

	var xhr = new XMLHttpRequest();
	xhr.open("get", "data.json", true);
	xhr.send();
	xhr.onload = function(e) {
		input.value = e.target.responseText;
		go();
	}

})();
