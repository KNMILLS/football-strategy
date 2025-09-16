extends Node

static func choose_offense(down: int, to_go: int, ball_on: int, offense_dir: int) -> String:
	# First and ten
	if down == 1 and to_go >= 10:
		return _pick(["RUN_IN", "PASS_SHORT"], [50, 50])
	# Second/Third and long
	if (down == 2 or down == 3) and to_go >= 8:
		return _pick(["PASS_SHORT", "PASS_LONG"], [70, 30])
	# Fourth and five or more
	if down == 4 and to_go >= 5:
		var rules: Object = Engine.get_main_loop().root.get_node("/root/Rules")
		var buck: String = rules.field_goal_bucket(ball_on, offense_dir)
		if buck != "":
			return "FG"
		return "PUNT"
	# Otherwise simple mix
	return _pick(["RUN_IN", "RUN_OUT", "PASS_SHORT"], [40, 25, 35])

static func _pick(items: Array, weights: Array) -> String:
	var sm: Object = Engine.get_main_loop().root.get_node("/root/SeedManager")
	var opts: Array = []
	for i in items.size():
		opts.append([items[i], int(weights[i])])
	return String(sm.weighted_choice(opts))
