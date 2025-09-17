extends Node

func test_sim_report_runs_and_outputs_sane_ranges() -> void:
	var SimReport := load("res://tools/SimReport.gd")
	var res: Dictionary = SimReport.call("run", 24680, 1000)
	# Basic sanity ranges; not asserting tight balance
	assert(res.has("sack_rate") and res.sack_rate >= 0.0 and res.sack_rate <= 0.20)
	assert(res.has("int_rate") and res.int_rate >= 0.0 and res.int_rate <= 0.10)
	assert(res.has("fumble_lost_rate") and res.fumble_lost_rate >= 0.0 and res.fumble_lost_rate <= 0.08)
	assert(res.has("off_bp_rate") and res.off_bp_rate >= 0.0 and res.off_bp_rate <= 0.06)
	assert(res.has("def_bp_rate") and res.def_bp_rate >= 0.0 and res.def_bp_rate <= 0.04)
	var run_share := float(res.get("run_share", 0.0))
	var pass_share := float(res.get("pass_share", 0.0))
	assert(run_share + pass_share > 0.95 and run_share + pass_share <= 1.01)


