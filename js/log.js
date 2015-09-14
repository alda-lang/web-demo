(function() {
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

	window.log = log;
})();
