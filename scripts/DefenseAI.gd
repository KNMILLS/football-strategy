extends Node

static func _sm() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	return tree.root.get_node("/root/SeedManager")

static func _rules() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	return tree.root.get_node("/root/Rules")

static func choose_defense(down: int, to_go: int, _ball_on: int, _offense_dir: int, last_offensive_calls: Array) -> String:
	# 1. First down with ten to go: Balanced
	if down == 1 and to_go >= 10:
		return "BALANCED"
	# 2. Two or fewer to go: Run Blitz
	if to_go <= 2:
		return "RUN_BLITZ"
	# 3. Second/Third and 8+ : Pass Shell
	if (down == 2 or down == 3) and to_go >= 8:
		return "PASS_SHELL"
	# 4. Fourth and 5+ : Pass Shell
	if down == 4 and to_go >= 5:
		return "PASS_SHELL"
	# 5. If last two offensive calls were passes then 25% chance All Out Rush
	if last_offensive_calls.size() >= 2:
		var last_two := last_offensive_calls.slice(max(0, last_offensive_calls.size() - 2), last_offensive_calls.size())
		var both_pass := true
		for last_call in last_two:
			if last_call != "PASS_SHORT" and last_call != "PASS_LONG":
				both_pass = false
				break
		if both_pass and _sm().chance(0.25):
			return "ALL_OUT_RUSH"
	# 6. Otherwise random front
	var options: Array = _rules().DATA["plays"]["DEFENSE"]
	var idx: int = int(_sm().randi_range(0, options.size() - 1))
	return String(options[int(idx)])


