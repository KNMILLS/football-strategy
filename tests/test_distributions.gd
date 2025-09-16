extends Node

func test_distributions_core_bounds() -> void:
	var sm: Object = get_node("/root/SeedManager")
	var rules: Object = get_node("/root/Rules")
	var QA := load("res://qa/QAConfig.gd")
	sm.set_seed(QA.SEED_MAIN)
	# PASS_LONG vs PASS_SHELL
	var trials: int = QA.TRIALS_DIST
	var incomps := 0
	var ints := 0
	for i in trials:
		var o: Dictionary = rules.resolve_play("PASS_LONG", "PASS_SHELL", 50, 1)
		if o.event_name == "INCOMP":
			incomps += 1
		elif o.event_name == "INT":
			ints += 1
	var p_incomp := float(incomps) / float(trials)
	var p_int := float(ints) / float(trials)
	assert(p_incomp >= 0.45)
	assert(p_int >= 0.03 and p_int <= 0.12)
	# PASS_SHORT vs ALL_OUT_RUSH
	var sacks := 0
	var ten_plus := 0
	for i in trials:
		var o2: Dictionary = rules.resolve_play("PASS_SHORT", "ALL_OUT_RUSH", 50, 1)
		if o2.event_name == "SACK":
			sacks += 1
		elif o2.yards_delta != null and int(o2.yards_delta) >= 10:
			ten_plus += 1
	assert(float(sacks) / float(trials) >= 0.15)
	assert(ten_plus > 0)
	# Punts
	var blocked := 0
	var tot_net := 0
	for i in trials:
		var r: Dictionary = rules.do_punt(50, 1)
		if r.blocked:
			blocked += 1
		else:
			var net := int(r.new_spot) - 50
			tot_net += net
	var p_block := float(blocked) / float(trials)
	var mean_net := float(tot_net) / float(max(1, trials - blocked))
	assert(p_block >= 0.03 and p_block <= 0.08)
	assert(mean_net >= 35.0 and mean_net <= 43.0)
	# Save JSON report
	var tallies := {
		"trials": trials,
		"rates": {"INCOMP": p_incomp, "INT": p_int, "BLOCK": p_block},
		"means": {"punt_net": mean_net}
	}
	var bounds := {"INT_pct": [0.03, 0.12]}
	var report: Dictionary = load("res://qa/Reports.gd").new().build_distribution_report("dist_core", tallies, bounds)
	load("res://qa/Reports.gd").new().save_report("dist_core", report)


