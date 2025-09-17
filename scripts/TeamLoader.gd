extends Node

# Loads team JSON definitions from res://teams/*.json
# Provides accessors for UI and AI selection.

var team_id_to_def: Dictionary = {}
var ordered_team_ids: Array = []

func _ready() -> void:
	_load_all()

func _load_all() -> void:
	team_id_to_def.clear()
	ordered_team_ids.clear()
	var dir_path := "res://teams"
	if not DirAccess.dir_exists_absolute(dir_path):
		return
	var files := DirAccess.get_files_at(dir_path)
	for f in files:
		if f.ends_with(".json"):
			var full: String = dir_path + "/" + f
			var data: Variant = _read_json(full)
			if typeof(data) == TYPE_DICTIONARY and data.has("team_id"):
				var tid := String(data["team_id"]).strip_edges()
				# Enforce schema for team files (default expected version 1.0)
				var sg := load("res://scripts/SchemaGuard.gd")
				if sg != null and sg.has_method("require"):
					# Teams did not previously have schema_version; set expectation to "1.0"
					sg.call("require", data as Dictionary, "1.0", f)
				team_id_to_def[tid] = data
				ordered_team_ids.append(tid)
	# Sort stable by display name if present
	ordered_team_ids.sort_custom(Callable(self, "_cmp_display"))

func _cmp_display(a: String, b: String) -> bool:
	var da := String(team_id_to_def.get(a, {}).get("display_name", a))
	var db := String(team_id_to_def.get(b, {}).get("display_name", b))
	if da == db:
		return a < b
	return da < db

func _read_json(path: String) -> Variant:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {}
	var txt := f.get_as_text()
	var p := JSON.new()
	var err := p.parse(txt)
	if err != OK:
		push_warning("Failed parsing team json: %s" % path)
		return {}
	return p.get_data()

func get_team_ids() -> Array:
	return ordered_team_ids.duplicate()

func get_team_dict(team_id: String) -> Dictionary:
	return team_id_to_def.get(team_id, {})

func get_display_name(team_id: String) -> String:
	var d := get_team_dict(team_id)
	return String(d.get("display_name", team_id))

func get_all_display_pairs() -> Array:
	var out: Array = []
	for tid in ordered_team_ids:
		out.append([tid, get_display_name(tid)])
	return out

# Returns an ordered list of team dictionaries. Prefers data/teams_32.json if present; otherwise
# returns currently loaded teams from res://teams sorted by display name.
func list_teams() -> Array:
	# Prefer unified 32-team data when available
	var path_32 := "res://data/teams_32.json"
	if FileAccess.file_exists(path_32):
		var f := FileAccess.open(path_32, FileAccess.READ)
		if f != null:
			var txt := f.get_as_text()
			var p := JSON.new()
			if p.parse(txt) == OK:
				var arr: Array = p.get_data()
				if typeof(arr) == TYPE_ARRAY:
					return arr
	# Fallback to already loaded loose team files
	var teams: Array = []
	for tid in ordered_team_ids:
		var d := get_team_dict(String(tid)).duplicate(true)
		# Ensure minimal fields exist
		d["team_id"] = String(tid)
		d["display_name"] = String(d.get("display_name", String(tid)))
		if not d.has("abbrev"):
			d["abbrev"] = get_abbrev(String(d.get("display_name", String(tid))))
		if not d.has("colors"):
			d["colors"] = {"primary":"#30343f","secondary":"#bfc0c0","accent":"#ffd34d"}
		teams.append(d)
	return teams

func get_abbrev(name: String) -> String:
	var parts := name.strip_edges().split(" ", false)
	if parts.size() == 1:
		var s := String(parts[0])
		if s.length() >= 2:
			return s.substr(0, 2).to_upper()
		return s.to_upper()
	var ab := ""
	for w in parts:
		if String(w).length() > 0:
			ab += String(w).substr(0, 1).to_upper()
	if ab.length() <= 1 and name.length() >= 2:
		ab = name.substr(0, 2).to_upper()
	return ab
