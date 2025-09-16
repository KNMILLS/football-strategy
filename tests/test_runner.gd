extends Node

var results := {"passed": 0, "failed": 0}

func _ready() -> void:
	print(run_all())
	get_tree().quit()

func _discover_suites() -> Array:
	var suites: Array = []
	var dir := DirAccess.open("res://tests")
	if dir:
		dir.list_dir_begin()
		while true:
			var f := dir.get_next()
			if f == "":
				break
			if dir.current_is_dir():
				continue
			if f.begins_with("test_") and f.ends_with(".gd"):
				if f == "test_runner.gd":
					continue
				var p := "res://tests/" + f
				var s := load(p)
				if s:
					suites.append(s.new())
		dir.list_dir_end()
	return suites

func run_all(filter: String = "") -> String:
	results.passed = 0
	results.failed = 0
	var suites := _discover_suites()
	for suite in suites:
		for method in suite.get_method_list():
			var name: String = method.name
			if name.begins_with("test_") and (filter == "" or name.findn(filter) != -1):
				if suite.has_method("_before_each"):
					suite.call("_before_each")
				suite.call(name)
				results.passed += 1
				print("PASS ", name)
	return "Tests Passed %d Failed %d" % [results.passed, results.failed]

