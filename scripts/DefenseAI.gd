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
	var all_fronts: Array = _rules().DATA["plays"]["DEFENSE"]
	# Predict offense mix with Laplace smoothing and scheme priors
	var off_base := ["RUN_IN", "RUN_OUT", "PASS_SHORT", "PASS_LONG"]
	var counts := {}
	for k in off_base:
		counts[k] = 1 # Laplace
	for c in last_offensive_calls:
		if counts.has(c):
			counts[c] = int(counts[c]) + 1
	# Blend situational tendency
	if to_go <= 2:
		counts["RUN_IN"] = int(counts["RUN_IN"]) + 2
		counts["RUN_OUT"] = int(counts["RUN_OUT"]) + 1
	elif (down == 2 or down == 3) and to_go >= 8:
		counts["PASS_SHORT"] = int(counts["PASS_SHORT"]) + 2
		counts["PASS_LONG"] = int(counts["PASS_LONG"]) + 1
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
	# Bluff: if pass-heavy, occasionally ALL_OUT_RUSH; if run-heavy, occasionally RUN_BLITZ
	var pass_p := float(p["PASS_SHORT"]) + float(p["PASS_LONG"])
	var run_p := float(p["RUN_IN"]) + float(p["RUN_OUT"])
	if _sm().chance(bluff * 1.0):
		if pass_p >= 0.60:
			best_front = "ALL_OUT_RUSH"
		elif run_p >= 0.60:
			best_front = "RUN_BLITZ"
	# Exploration
	if _sm().chance(eps):
		var idx: int = int(_sm().randi_range(0, all_fronts.size() - 1))
		best_front = String(all_fronts[int(idx)])
	return best_front

static func _expected_yards_for(off_play: String, def_front: String) -> float:
	var base_table: Array = _rules().DATA["matrix"][off_play][def_front]
	var sr := _sr()
	if sr != null and sr.has_method("adjusted_matrix_table"):
		base_table = sr.call("adjusted_matrix_table", base_table, off_play)
	var total_w := 0.0
	var accum := 0.0
	for row in base_table:
		var token := String(row[0])
		var w := float(int(row[1]))
		total_w += w
		var yd := 0.0
		if token == "INCOMP":
			yd = 0.0
		elif token == "INT":
			yd = -10.0
		elif token == "FUMBLE":
			yd = -5.0 # 50% turnover expected cost
		elif token.begins_with("SACK_"):
			yd = float(int(token.get_slice("_", 1)))
		elif token.begins_with("PENALTY_DEF_") or token.begins_with("PENALTY_OFF_"):
			yd = float(int(token.get_slice("_", 2)))
		else:
			yd = float(int(token))
		accum += yd * w
	if total_w <= 0.0:
		return 0.0
	return accum / total_w
