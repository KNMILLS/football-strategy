extends Node

func _run_scripted_once(run_seed: int) -> Array:
	var sm := get_node("/root/SeedManager")
	var gs := get_node("/root/GameState")
	var rules := get_node("/root/Rules")
	var seq := [["PASS_SHORT","PASS_SHELL"],["RUN_IN","RUN_BLITZ"],["PASS_LONG","BALANCED"],["RUN_OUT","BALANCED"],["FG","BALANCED"]]
	sm.set_seed(run_seed)
	gs.set_session_config("balancedpro_balanced", "balancedpro_balanced", 1)
	gs.new_session(run_seed, 1, 1)
	var outcomes: Array = []
	for pair in seq:
		var o: Dictionary = rules.resolve_play(String(pair[0]), String(pair[1]), gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o)
		outcomes.append([o.event_name, o.yards_delta])
	return outcomes

func test_scripted_five_snaps_repro() -> void:
	var test_seed := 123456
	var a1 := _run_scripted_once(test_seed)
	var a2 := _run_scripted_once(test_seed)
	assert(a1 == a2)

func test_determinism_sequence_and_rng_counts() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var rules: Object = get_node("/root/Rules")
	var gs: Object = get_node("/root/GameState")
	var QA := load("res://qa/QAConfig.gd")
	var seq := [
		{"off":"PASS_SHORT", "def":"PASS_SHELL"},
		{"off":"PASS_LONG", "def":"RUN_BLITZ"},
		{"off":"RUN_IN", "def":"BALANCED"},
		{"off":"FG", "def":"BALANCED"},
		{"off":"PUNT", "def":"BALANCED"}
	]
	# First run
	sm.set_seed(QA.SEED_MAIN)
	gs.new_session(QA.SEED_MAIN, 1, 1)
	var snaps1: Array = []
	for step in seq:
		var before: int = sm.get_rng_call_count()
		var o: Dictionary = rules.resolve_play(step.off, step.def, gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o)
		rules.assert_state(gs)
		var after: int = sm.get_rng_call_count()
		snaps1.append({"before": before, "after": after, "outcome": o.duplicate(true)})
	# Second run
	sm.set_seed(QA.SEED_MAIN)
	gs.new_session(QA.SEED_MAIN, 1, 1)
	var snaps2: Array = []
	for step in seq:
		var before2: int = sm.get_rng_call_count()
		var o2: Dictionary = rules.resolve_play(step.off, step.def, gs.ball_on, gs.offense_dir)
		rules.apply_outcome(gs, o2)
		rules.assert_state(gs)
		var after2: int = sm.get_rng_call_count()
		snaps2.append({"before": before2, "after": after2, "outcome": o2.duplicate(true)})
	assert(snaps1.size() == snaps2.size())
	for i in snaps1.size():
		assert(snaps1[i].before == snaps2[i].before)
		assert(snaps1[i].after == snaps2[i].after)
		assert(JSON.stringify(snaps1[i].outcome) == JSON.stringify(snaps2[i].outcome))
	# HUD screenshot
	var drv: Node = load("res://qa/MCPDriver.gd").new()
	var path: String = String(drv.call("capture_viewport_screenshot", QA.ARTIFACT_DIR.plus_file("hud_seed%d.png" % QA.SEED_MAIN)))
	assert(path.findn("hud_seed") != -1)


