extends Node

class_name SimReport

static func _rules() -> Object:
	return Engine.get_main_loop().root.get_node("/root/Rules")

static func _gs() -> Object:
	return Engine.get_main_loop().root.get_node("/root/GameState")

static func _sm() -> Object:
	return Engine.get_main_loop().root.get_node("/root/SeedManager")

static func run(seed_value: int, snaps: int) -> Dictionary:
	var sm := _sm()
	var gs := _gs()
	var rules := _rules()
	sm.set_seed(seed_value)
	gs.set_session_config("balancedpro_balanced", "balancedpro_balanced", 1)
	gs.new_session(seed_value, 1, 0)
	var stats := {
		"sack": 0, "int": 0, "fumble": 0, "fumble_lost": 0,
		"off_bp": 0, "def_bp": 0, "run": 0, "pass": 0, "snaps": 0
	}
	var ai_off := load("res://scripts/OffenseAI.gd")
	var ai_def := load("res://scripts/DefenseAI.gd")
	for i in snaps:
		var op := String(ai_off.call("choose_offense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir))
		if op == "RUN_IN" or op == "RUN_OUT":
			stats.run += 1
		else:
			stats.pass += 1
		var df := String(ai_def.call("choose_defense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir, gs.last_offensive_calls))
		var o: Dictionary = rules.resolve_play(op, df, gs.ball_on, gs.offense_dir)
		if String(o.get("event_name", "")) == "SACK":
			stats.sack += 1
		elif String(o.get("event_name", "")) == "INT":
			stats.int += 1
		elif String(o.get("event_name", "")) == "FUMBLE":
			stats.fumble += 1
			if bool(o.get("turnover", false)):
				stats.fumble_lost += 1
		if bool(o.get("big_play", false)):
			if bool(o.get("defense_td", false)):
				stats.def_bp += 1
			else:
				stats.off_bp += 1
		rules.apply_outcome(gs, o)
		stats.snaps += 1
        # No drive gating in regulation; run fixed number of snaps
	# Rates
	var result := {
		"sack_rate": float(stats.sack) / max(1.0, float(stats.snaps)),
		"int_rate": float(stats.int) / max(1.0, float(stats.snaps)),
		"fumble_lost_rate": float(stats.fumble_lost) / max(1.0, float(stats.snaps)),
		"off_bp_rate": float(stats.off_bp) / max(1.0, float(stats.snaps)),
		"def_bp_rate": float(stats.def_bp) / max(1.0, float(stats.snaps)),
		"run_share": float(stats.run) / max(1.0, float(stats.snaps)),
		"pass_share": float(stats.pass) / max(1.0, float(stats.snaps))
	}
	# Persist
	var out_path := "user://qa_artifacts/rates_%d_%d.json" % [seed_value, snaps]
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("user://qa_artifacts"))
	var f := FileAccess.open(out_path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(result, "\t"))
		f.close()
	return result


