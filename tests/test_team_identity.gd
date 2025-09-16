extends Node

func _save_json(path: String, data: Dictionary) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data, "\t"))

func test_westcoast_short_pass_completion_up() -> void:
	var _sm := get_node("/root/SeedManager")
	var rules := get_node("/root/Rules")
	var gs := get_node("/root/GameState")
	# Baseline: Balanced vs Balanced
	_sm.set_seed(4242)
	gs.set_session_config("balancedpro_balanced", "balancedpro_balanced", 1)
	gs.new_session(4242, 1, 0)
	var base_comp := _measure_short_pass_completion(rules)
	# West Coast offense vs balanced defense
	_sm.set_seed(4242)
	gs.set_session_config("westcoast_cover2", "balancedpro_balanced", 1)
	gs.new_session(4242, 1, 0)
	var wc_comp := _measure_short_pass_completion(rules)
	var delta := wc_comp - base_comp
	_save_json("user://qa_artifacts/team_identity_westcoast.json", {"base": base_comp, "westcoast": wc_comp, "delta": delta})
	assert(delta > 0.02 and delta < 0.08)

func _measure_short_pass_completion(rules: Object) -> float:
	var sm := get_node("/root/SeedManager")
	var completes := 0
	var total := 5000
	for i in total:
		var o: Dictionary = rules.resolve_play("PASS_SHORT", "BALANCED", 50, 1)
		if o.event_name == "INCOMP":
			continue
		if o.event_name == "INT":
			continue
		if o.event_name == "SACK":
			continue
		completes += 1
	return float(completes) / float(total)


