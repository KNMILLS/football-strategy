extends VBoxContainer

@onready var logo_rect: TextureRect = $Logo
@onready var fallback_rect: ColorRect = $Fallback
@onready var abbrev_label: Label = $Fallback/Abbrev
@onready var name_label: Label = $Name
@onready var tags_label: Label = $Tags
@onready var colors_hbox: HBoxContainer = $Colors
@onready var lock_label: Label = $Lock

var current_team: Dictionary = {}

func _ready() -> void:
	set_locked(false, "")

func set_team(team_dict: Dictionary) -> void:
	current_team = team_dict.duplicate(true)
	var display_name := String(team_dict.get("display_name", team_dict.get("team_id", "TEAM")))
	name_label.text = display_name
	var o := String(team_dict.get("offense_scheme", team_dict.get("offense_archetype", "")))
	var d := String(team_dict.get("defense_scheme", team_dict.get("defense_archetype", "")))
	var city := String(team_dict.get("city", ""))
	tags_label.text = (city + (" — " if city != "" else "") + o + (" / " if o != "" and d != "" else "") + d).strip_edges()
	_update_logo_or_fallback(team_dict)
	_update_color_chips(team_dict)

func set_locked(is_locked: bool, side: String) -> void:
	lock_label.visible = bool(is_locked)
	lock_label.text = ("LOCKED " + side.to_upper()).strip_edges()

func _update_logo_or_fallback(team_dict: Dictionary) -> void:
	var logo_path := String(team_dict.get("logo_path", ""))
	if logo_path != "" and ResourceLoader.exists(logo_path):
		var tex := load(logo_path)
		if tex is Texture2D:
			logo_rect.texture = tex
			logo_rect.visible = true
			fallback_rect.visible = false
			return
	# Fallback tile
	logo_rect.texture = null
	logo_rect.visible = false
	fallback_rect.visible = true
	var colors: Dictionary = team_dict.get("colors", {})
	var primary := _parse_color(String(colors.get("primary", "#2a2d34")))
	var accent := _parse_color(String(colors.get("accent", "#ffd34d")))
	var abbrev := String(team_dict.get("abbrev", "TM"))
	fallback_rect.color = primary
	abbrev_label.text = abbrev
	abbrev_label.modulate = accent

func _update_color_chips(team_dict: Dictionary) -> void:
	for c in colors_hbox.get_children():
		colors_hbox.remove_child(c)
		c.queue_free()
	var colors: Dictionary = team_dict.get("colors", {})
	var keys := ["primary", "secondary", "accent"]
	for k in keys:
		var v := String(colors.get(k, "#808080"))
		var cr := ColorRect.new()
		cr.custom_minimum_size = Vector2(14, 14)
		cr.color = _parse_color(v)
		colors_hbox.add_child(cr)

func _parse_color(s: String) -> Color:
	var c := Color(0.5, 0.5, 0.5)
	if s.begins_with("#"):
		return Color.from_string(s, c)
	return c


