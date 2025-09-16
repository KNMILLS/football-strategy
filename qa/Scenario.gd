extends Node

const QAConfig = preload("res://qa/QAConfig.gd")

static func _sm() -> Object:
	return Engine.get_main_loop().root.get_node("/root/SeedManager")

static func _gs() -> Object:
	return Engine.get_main_loop().root.get_node("/root/GameState")

static func _rules() -> Object:
	return Engine.get_main_loop().root.get_node("/root/Rules")

static func run_sequence(seq_name: String, seed_value: int, steps: Array) -> Dictionary:
	QAConfig.ensure_artifact_dir()
	_sm().set_seed(seed_value)
	_gs().new_session(seed_value, 1, 1) # hot seat to respect step pairs
	var log_data: Dictionary = {
		"name": seq_name,
		"seed": seed_value,
		"snaps": [],
		"rng_calls_total": 0
	}
	for step in steps:
		var before := int(_sm().get_rng_call_count() if _sm().has_method("get_rng_call_count") else _sm().rng_call_count)
		var off: String = String(step.get("off", "PASS_SHORT"))
		var def: String = String(step.get("def", "BALANCED"))
		var outcome: Dictionary = _rules().resolve_play(off, def, _gs().ball_on, _gs().offense_dir)
		_rules().apply_outcome(_gs(), outcome)
		_rules().assert_state(_gs())
		var after := int(_sm().get_rng_call_count() if _sm().has_method("get_rng_call_count") else _sm().rng_call_count)
		log_data.snaps.append({
			"off": off,
			"def": def,
			"before": before,
			"after": after,
			"outcome": outcome,
			"ball_on": int(_gs().ball_on),
			"down": int(_gs().down),
			"to_go": int(_gs().to_go)
		})
		log_data.rng_calls_total = after
	var report := {
		"name": seq_name,
		"seed": seed_value,
		"timestamp": Time.get_datetime_string_from_system(false, true),
		"rng_calls": int(log_data.rng_calls_total),
		"summary": {"trials": steps.size(), "pass": true, "failures": 0, "notes": "sequence"},
		"metrics": {},
		"bounds": {},
		"artifacts": {"screenshots": []},
		"snaps": log_data.snaps
	}
	var _outfile: String = QAConfig.ARTIFACT_DIR.path_join("seq_%s.json" % seq_name)
	load("res://qa/Reports.gd").new().save_report("seq_%s" % seq_name, report)
	return report


