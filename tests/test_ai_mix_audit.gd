extends Node

func _simulate_mix(level: int, snaps: int) -> Dictionary:
	var gs := get_node("/root/GameState")
	var sm := get_node("/root/SeedManager")
	var ai_off := load("res://scripts/OffenseAI.gd")
	var ai_def := load("res://scripts/DefenseAI.gd")
	var counts := {"RUN_IN":0, "RUN_OUT":0, "PASS_SHORT":0, "PASS_LONG":0}
	gs.set_session_config("balancedpro_balanced", "balancedpro_balanced", level)
	sm.set_seed(7777 + level)
	gs.new_session(sm.get_seed(), 9999, 0)
	for i in snaps:
		var op := String(ai_off.call("choose_offense", gs.down, gs.to_go, gs.ball_on, gs.offense_dir))
		if counts.has(op):
			counts[op] = int(counts[op]) + 1
		gs.offense_select(op)
		if gs.drive_ended and gs.drive_index >= gs.num_drives:
			break
	return counts

func test_mix_audit_no_domination() -> void:
	var snaps := 4000
	for level in [0,1,2]:
		var c := _simulate_mix(level, snaps)
		var denom := 0
		for k in ["RUN_IN","RUN_OUT","PASS_SHORT","PASS_LONG"]:
			denom += int(c.get(k, 0))
		for k in ["RUN_IN","RUN_OUT","PASS_SHORT","PASS_LONG"]:
			var share: float = float(c.get(k, 0)) / max(1.0, float(denom))
			assert(share <= 0.50)
