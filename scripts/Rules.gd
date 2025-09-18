extends "res://scripts/Rules12x6.gd"

# Compatibility wrapper to support legacy play keys from v1.0 UI/AI

func _map_offense_play(key: String) -> String:
	match key:
		"RUN_IN":
			return "INSIDE_POWER"
		"RUN_OUT":
			return "OUTSIDE_ZONE"
		"PASS_SHORT":
			return "QUICK_SLANT"
		"PASS_LONG":
			return "DEEP_POST"
		"PUNT":
			return "PUNT"
		"FG":
			return "FIELD_GOAL"
		_:
			return key

func _map_defense_front(key: String) -> String:
	match key:
		"ALL_OUT_RUSH":
			return "PRESS_MAN"
		"PUNT_RETURN":
			return "BALANCED"
		_:
			return key

func resolve_play(off_play: String, def_play: String, ball_on: int, offense_dir: int) -> Dictionary:
	return super.resolve_play(_map_offense_play(off_play), _map_defense_front(def_play), ball_on, offense_dir)

func expected_yards_for(off_play: String, def_front: String) -> float:
	return super.expected_yards_for(_map_offense_play(off_play), _map_defense_front(def_front))
