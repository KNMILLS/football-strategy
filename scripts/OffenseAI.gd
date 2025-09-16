extends Node

static func _sm() -> Object:
	return Engine.get_main_loop().root.get_node("/root/SeedManager")

static func _rules() -> Object:
	return Engine.get_main_loop().root.get_node("/root/Rules")

static func _sr() -> Object:
	var gs: Object = Engine.get_main_loop().root.get_node("/root/GameState")
	if gs != null and gs.has_method("get_session_rules"):
		return gs.call("get_session_rules")
	return null

static func _difficulty() -> Object:
	return Engine.get_main_loop().root.get_node("/root/Difficulty")

static func choose_offense(down: int, to_go: int, ball_on: int, offense_dir: int) -> String:
	# Fourth-down posture
	if down == 4 and to_go >= 5:
		var buck: String = _rules().field_goal_bucket(ball_on, offense_dir)
		if buck != "":
			return "FG"
		return "PUNT"
	# Base weights
	var plays := ["RUN_IN", "RUN_OUT", "PASS_SHORT", "PASS_LONG"]
	var weights := {
		"RUN_IN": 40.0, "RUN_OUT": 25.0, "PASS_SHORT": 35.0, "PASS_LONG": 20.0
	}
	# Situational overrides
	if to_go <= 2:
		weights["RUN_IN"] += 20.0
		weights["RUN_OUT"] += 10.0
	elif (down == 2 or down == 3) and to_go >= 8:
		weights["PASS_SHORT"] += 20.0
		weights["PASS_LONG"] += 10.0
	# Scheme bias
	var sr := _sr()
	if sr != null and sr.has_method("get_offense_bias"):
		var ob := sr.call("get_offense_bias") as Dictionary
		for k in plays:
			weights[k] = float(weights[k]) * (1.0 + float(ob.get(k, 0.0)))
	# Normalize and pick with exploration epsilon
	var diff := _difficulty()
	var eps := 0.05
	if diff != null:
		eps = float(diff.call("exploration_epsilon")) * 0.5 # offense explores less
	if _sm().chance(eps):
		return String(plays[int(_sm().randi_range(0, plays.size() - 1))])
	return _pick_weights(weights)

static func _pick_weights(weights: Dictionary) -> String:
	var opts: Array = []
	for k in ["RUN_IN", "RUN_OUT", "PASS_SHORT", "PASS_LONG"]:
		opts.append([k, int(round(float(weights[k])))])
	return String(_sm().weighted_choice(opts))
