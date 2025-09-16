extends Node

const QAConfig = preload("res://qa/QAConfig.gd")

static func _rules() -> Object:
	return Engine.get_main_loop().root.get_node("/root/Rules")

static func _gs() -> Object:
	return Engine.get_main_loop().root.get_node("/root/GameState")

static func _sm() -> Object:
	return Engine.get_main_loop().root.get_node("/root/SeedManager")

static func _main_scene() -> Node:
	var scene: Node = load("res://Main.tscn").instantiate()
	Engine.get_main_loop().root.add_child(scene)
	return scene

static func boot_session(props := {}) -> Node:
	# props: {seed:int, drives:int, mode:int, use_main_scene:bool}
	var seed_value: int = int(props.get("seed", 424242))
	var drives: int = int(props.get("drives", 4))
	var mode: int = int(props.get("mode", 0))
	var use_main_scene: bool = bool(props.get("use_main_scene", false))
	_sm().set_seed(seed_value)
	if use_main_scene:
		var root: Node = _main_scene()
		_gs().new_session(seed_value, drives, mode)
		return root
	else:
		_gs().new_session(seed_value, drives, mode)
		return null

static func scripted_drive(steps: Array) -> Dictionary:
	# Steps: [{off:String, def:String?}]
	var log_data: Dictionary = {"snaps": []}
	for step in steps:
		var before_calls: int = _sm().get_rng_call_count() if _sm().has_method("get_rng_call_count") else int(_sm().rng_call_count)
		var off: String = String(step.get("off", "PASS_SHORT"))
		var def: String = String(step.get("def", "BALANCED"))
		var outcome: Dictionary = _rules().resolve_play(off, def, _gs().ball_on, _gs().offense_dir)
		_rules().apply_outcome(_gs(), outcome)
		_rules().assert_state(_gs())
		var after_calls: int = _sm().get_rng_call_count() if _sm().has_method("get_rng_call_count") else int(_sm().rng_call_count)
		log_data.snaps.append({
			"before": before_calls,
			"after": after_calls,
			"off": off,
			"def": def,
			"outcome": outcome,
			"ball_on": int(_gs().ball_on),
			"down": int(_gs().down),
			"to_go": int(_gs().to_go)
		})
	return log_data

static func assert_invariants(_state: Dictionary) -> void:
	_rules().assert_state(_gs())

static func yard_label(spot: int, dir: int) -> String:
	return _rules().yards_to_string(dir, spot, true)

static func write_json(path: String, data: Dictionary) -> void:
	var dir_path := path.get_base_dir()
	if dir_path != "":
		DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(dir_path))
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data, "\t"))
		f.flush()
		f.close()

static func screenshot(file_name: String) -> String:
	var out_path: String = QAConfig.ARTIFACT_DIR.path_join(file_name)
	var drv: Node = load("res://qa/MCPDriver.gd").new()
	var ok_path: String = String(drv.call("capture_viewport_screenshot", out_path))
	return ok_path


