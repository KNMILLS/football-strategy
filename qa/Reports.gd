extends Node

const QAConfig = preload("res://qa/QAConfig.gd")

static func _sm() -> Object:
	return Engine.get_main_loop().root.get_node("/root/SeedManager")

func build_distribution_report(report_name: String, tallies: Dictionary, bounds: Dictionary) -> Dictionary:
	var curr_seed := int(_sm().current_seed)
	var report := {
		"name": report_name,
		"seed": curr_seed,
		"timestamp": Time.get_datetime_string_from_system(false, true),
		"rng_calls": int(_sm().rng_call_count),
		"summary": {"trials": int(tallies.get("trials", 0)), "pass": true, "failures": 0, "notes": ""},
		"metrics": {
			"rates": tallies.get("rates", {}),
			"means": tallies.get("means", {})
		},
		"bounds": bounds,
		"artifacts": {"screenshots": []}
	}
	return report

func save_report(report_name: String, report: Dictionary) -> void:
	QAConfig.ensure_artifact_dir()
	var path: String = QAConfig.ARTIFACT_DIR.path_join("%s_%s.json" % [report_name, str(report.get("seed", 0))])
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(report, "\t"))
		f.flush()
		f.close()


