extends Node

const QAConfig = preload("res://qa/QAConfig.gd")

func _runtime() -> Object:
	if Engine.is_editor_hint():
		return Engine.get_main_loop().root.get_node_or_null("/root/GDAIMCPRuntime")
	return Engine.get_main_loop().root.get_node_or_null("/root/GDAIMCPRuntime")

func run_tests(filter: String = "") -> String:
	# Fallback: directly invoke test runner
	var runner: Node = load("res://tests/test_runner.gd").new()
	return String(runner.call("run_all", filter))

func capture_viewport_screenshot(outfile: String) -> String:
	QAConfig.ensure_artifact_dir()
	var img := get_viewport().get_texture().get_image()
	var abspath: String = ProjectSettings.globalize_path(outfile)
	var _dir_ok := DirAccess.make_dir_recursive_absolute(abspath.get_base_dir())
	img.save_png(abspath)
	return outfile

func capture_node_screenshot(node_path: String, outfile: String) -> String:
	var node := get_node_or_null(node_path)
	if node == null:
		return capture_viewport_screenshot(outfile)
	return capture_viewport_screenshot(outfile)


