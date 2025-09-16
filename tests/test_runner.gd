extends Node

var results := {"passed": 0, "failed": 0}

func _ready() -> void:
	# Allow running when scene is played standalone
	print(run_all())
	get_tree().quit()

func run_all(filter: String = "") -> String:
	results.passed = 0
	results.failed = 0
	var suites := [load("res://tests/test_rules.gd").new()]
	for suite in suites:
		for method in suite.get_method_list():
			var name: String = method.name
			if name.begins_with("test_") and (filter == "" or name.findn(filter) != -1):
				var ok := true
				var msg := ""
				try:
					suite.call(name)
				catch err:
					ok = false
					msg = str(err)
				if ok:
					results.passed += 1
					print("PASS ", name)
				else:
					results.failed += 1
					push_error("FAIL %s :: %s" % [name, msg])
	return "Tests Passed %d Failed %d" % [results.passed, results.failed]


