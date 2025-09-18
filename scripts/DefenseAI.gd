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

static func choose_defense(_down: int, _to_go: int, _ball_on: int, _offense_dir: int, _last_offensive_calls: Array) -> String:
	return "RUN_BLITZ"

static func _expected_yards_for(off_play: String, def_front: String) -> float:
	var rules := _rules()
	if rules != null and rules.has_method("expected_yards_for"):
		return float(rules.call("expected_yards_for", off_play, def_front))
	return 0.0
