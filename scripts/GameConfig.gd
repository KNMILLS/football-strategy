extends Node

var quarter_preset: String = "STANDARD"

func _ready() -> void:
	_load()

func set_quarter_preset(preset: String) -> void:
	var up := String(preset).to_upper()
	if up != "QUICK" and up != "STANDARD" and up != "FULL":
		up = "STANDARD"
	quarter_preset = up
	_save()

func get_quarter_preset() -> String:
	return String(quarter_preset)

func _load() -> void:
	# Try user config; else fall back to timing default_preset; else STANDARD
	var cf := ConfigFile.new()
	var err := cf.load("user://game_config.cfg")
	if err == OK:
		var v := String(cf.get_value("GameConfig", "quarter_preset", ""))
		if v == "QUICK" or v == "STANDARD" or v == "FULL":
			quarter_preset = v
			return
	# Fallback to timing default_preset if present
	var T := load("res://scripts/Timing.gd") as Script
	if T != null:
		var t: Object = T.new()
		t.call("load_cfg")
		var defp := String(t.cfg.get("default_preset", "STANDARD"))
		if defp == "QUICK" or defp == "STANDARD" or defp == "FULL":
			quarter_preset = defp
		else:
			quarter_preset = "STANDARD"

func _save() -> void:
	var cf := ConfigFile.new()
	cf.set_value("GameConfig", "quarter_preset", String(quarter_preset))
	cf.save("user://game_config.cfg")


