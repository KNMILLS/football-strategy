extends Node

static func _sm() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	return tree.root.get_node("/root/SeedManager")

static func _rules() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	return tree.root.get_node("/root/Rules")

static func _sr() -> Object:
	var tree := Engine.get_main_loop() as SceneTree
	var gs := tree.root.get_node("/root/GameState")
	if gs != null and gs.has_method("get_session_rules"):
		return gs.call("get_session_rules")
	return null

static func _difficulty() -> Object:
	return Engine.get_main_loop().root.get_node("/root/Difficulty")

static func choose_defense(down: int, to_go: int, _ball_on: int, _offense_dir: int, last_offensive_calls: Array) -> String:
	var all_fronts: Array = ["RUN_BLITZ", "BALANCED", "PASS_SHELL", "PRESS_MAN", "ZONE_BLITZ", "PREVENT"]
	# Predict offense mix with Laplace smoothing and scheme priors (mapped to new plays)
	var off_base := ["INSIDE_POWER", "OUTSIDE_ZONE", "QUICK_SLANT", "DEEP_POST"]
	var counts := {}
	for k in off_base:
		counts[k] = 1 # Laplace
	for c in last_offensive_calls:
		if counts.has(c):
			counts[c] = int(counts[c]) + 1
	# Blend situational tendency
	if to_go <= 2:
		counts["INSIDE_POWER"] = int(counts["INSIDE_POWER"]) + 2
		counts["OUTSIDE_ZONE"] = int(counts["OUTSIDE_ZONE"]) + 1
	elif (down == 2 or down == 3) and to_go >= 8:
		counts["QUICK_SLANT"] = int(counts["QUICK_SLANT"]) + 2
		counts["DEEP_POST"] = int(counts["DEEP_POST"]) + 1
	# Scheme offensive bias from session rules
	var sr := _sr()
	if sr != null and sr.has_method("get_offense_bias"):
		var ob := sr.call("get_offense_bias") as Dictionary
		for k2 in off_base:
			var bias := float(ob.get(k2, 0.0))
			counts[k2] = float(counts[k2]) + 5.0 * bias
	# Normalize to probabilities
	var total := 0.0
	for k3 in off_base:
		total += float(counts[k3])
	var p: Dictionary = {}
	for k4 in off_base:
		p[k4] = float(counts[k4]) / max(total, 1.0)
	# Compute expected yards per defense front
	var front_scores: Dictionary = {}
	for f in all_fronts:
		var expected_val := 0.0
		for op in off_base:
			var e := _expected_yards_for(String(op), String(f))
			expected_val += float(p[op]) * e
		front_scores[f] = expected_val
	# Apply defense scheme bias as small subtraction to expected (favoring preferred fronts)
	if sr != null and sr.has_method("get_defense_bias"):
		var db := sr.call("get_defense_bias") as Dictionary
		for f2 in all_fronts:
			front_scores[f2] = float(front_scores[f2]) - 2.0 * float(db.get(f2, 0.0))
	# Choose minimum expected yards
	var best_front := String(all_fronts[0])
	var best_val := 9999.0
	for f3 in all_fronts:
		var val := float(front_scores[f3])
		if val < best_val:
			best_val = val
			best_front = String(f3)
	# Difficulty adjustments: exploration and bluff
	var diff := _difficulty()
	var eps := 0.15
	var bluff := 0.10
	if diff != null:
		eps = float(diff.call("exploration_epsilon"))
		bluff = float(diff.call("bluff_probability"))
	# Bluff: if pass-heavy, occasionally PRESS_MAN; if run-heavy, occasionally RUN_BLITZ
	var pass_p := float(p["QUICK_SLANT"]) + float(p["DEEP_POST"]) 
	var run_p := float(p["INSIDE_POWER"]) + float(p["OUTSIDE_ZONE"]) 
	if _sm().chance(bluff * 1.0):
		if pass_p >= 0.60:
			best_front = "PRESS_MAN"
		elif run_p >= 0.60:
			best_front = "RUN_BLITZ"
	# Exploration
	if _sm().chance(eps):
		var idx: int = int(_sm().randi_range(0, all_fronts.size() - 1))
		best_front = String(all_fronts[int(idx)])
	return best_front

static func _expected_yards_for(off_play: String, def_front: String) -> float:
	var rules := _rules()
	if rules != null and rules.has_method("expected_yards_for"):
		return float(rules.call("expected_yards_for", off_play, def_front))
	return 0.0
