extends Node

func test_yardline_formatter_flip_perspective() -> void:
	var rules: Object = get_node("/root/Rules")
	# Same physical yard should flip labels when direction flips
	var spot := 30
	var label_home: String = rules.yards_to_string(1, spot, true)
	var label_away: String = rules.yards_to_string(-1, 100 - spot, false)
	# Example: OWN 30 vs OPP 30
	assert(label_home.begins_with("OWN ") or label_home == "50")
	assert(label_away.begins_with("OPP ") or label_away == "50")


